#!/usr/bin/env node
import * as ts from 'typescript'
import * as fs from 'fs'
import * as yargs from 'yargs'

// taken from https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API
function check(fileNames: string[], options: ts.CompilerOptions): void {
  const program = ts.createProgram(fileNames, options)
  const emitResult = program.emit()

  const allDiagnostics = ts
    .getPreEmitDiagnostics(program)
    .concat(emitResult.diagnostics)

  let count = 0
  allDiagnostics.forEach((diagnostic: ts.Diagnostic) => {
    const fileName = diagnostic.file.fileName
    if (diagnostic.file && fileNames.includes(fileName)) {
      const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
        diagnostic.start!
      )
      const message = getMessageText(diagnostic)
      console.log(`${fileName} (${line + 1},${character + 1}): ${message}`)
      count++
    }
  })
  process.exit(count === 0 ? 0 : 1)
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

check(argv._, options)
