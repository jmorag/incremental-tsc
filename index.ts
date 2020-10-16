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
  allDiagnostics.forEach(diagnostic => {
    const fileName = diagnostic.file.fileName
    if (diagnostic.file && fileNames.includes(fileName)) {
      const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
        diagnostic.start!
      )
      const message = diagnostic.messageText
      console.log(`${fileName} (${line + 1},${character + 1}): ${message}`)
      count++
    }
  })
  process.exit(count === 0 ? 0 : 1)
}

const readConfig = (path: string): ts.CompilerOptions => {
  const rawConfig = ts.readConfigFile(path, filename =>
    fs.readFileSync(filename, 'utf8')
  ).config
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
