#!/usr/bin/env node
import * as ts from 'typescript'
import * as fs from 'fs'
import * as yargs from 'yargs'
// This represents the + section of the @@ header of a patch
interface File {
  fileName: string
  lines?: { start: number; extent: number }
}

// taken from https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API
function check(files: File[], options: ts.CompilerOptions): void {
  const fileNames = files.map(f => f.fileName)
  const program = ts.createProgram(fileNames, options)
  const emitResult = program.emit()

  const allDiagnostics = ts
    .getPreEmitDiagnostics(program)
    .concat(emitResult.diagnostics)

  let exitCode = 0
  allDiagnostics.forEach((diagnostic: ts.Diagnostic) => {
    const fileName = diagnostic.file.fileName
    if (diagnostic.file && fileNames.includes(fileName)) {
      const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
        diagnostic.start!
      )
      const lines = files.find(f => f.fileName === fileName).lines
      const abs = (x: number) => x >= 0 ? x : -x
      if (lines === undefined || abs(line + 1 - lines.start) <= lines.extent) {
        const message = getMessageText(diagnostic)
        console.log(`${fileName} (${line + 1},${character + 1}): ${message}`)
        exitCode = 1
      }
    }
  })
  process.exit(exitCode)
}

function getMessageText(diagnostic: ts.Diagnostic): string {
  function go(message: string | ts.DiagnosticMessageChain): string {
    if (typeof message === 'string') return message
    const next = message.next
    return go(message.messageText) + (next ? '\n\t' + next.map(go) : '')
  }

  return go(diagnostic.messageText)
}

function readConfig(path: string): ts.CompilerOptions {
  const readFile = (path: string) => fs.readFileSync(path, 'utf8')
  const rawConfig = ts.readConfigFile(path, readFile).config
  return (
    ts.convertCompilerOptionsFromJson(rawConfig?.compilerOptions, '.')
      .options || {}
  )
}

function parseArgs(args: string[]): File[] {
  return args.map(arg => {
    const colon_ix = arg.indexOf(':')
    if (colon_ix === -1) return { fileName: arg }

    const errorMessage = `malformed argument ${arg}. Should be in the form file.ts:1,10`
    const fileName = arg.substring(0, colon_ix)
    const comma_ix = arg.indexOf(',')
    if (comma_ix === -1) throw errorMessage

    const start = parseInt(arg.substring(colon_ix + 1, comma_ix), 10)
    if (isNaN(start)) throw errorMessage

    const extent = parseInt(arg.substring(comma_ix + 1), 10)
    if (isNaN(extent)) throw errorMessage

    return { fileName, lines: { start, extent } }
  })
}

const argv = yargs(process.argv.slice(2))
  .demandCommand(1)
  .default('tsconfig', './tsconfig.json')
  .default('tsconfig-paths', './tsconfig.paths.json')
  .usage('Usage: $0 src/components/*.tsx').argv

const options = {
  ...readConfig(argv['tsconfig-paths']),
  ...readConfig(argv.tsconfig),
  noEmit: true,
}

check(parseArgs(argv._), options)
