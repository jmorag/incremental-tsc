import * as ts from 'typescript'
import * as fs from 'fs'

// taken from https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API
function compile(fileNames: string[], options: ts.CompilerOptions): void {
  let program = ts.createProgram(fileNames, options)
  let emitResult = program.emit()

  let allDiagnostics = ts
    .getPreEmitDiagnostics(program)
    .concat(emitResult.diagnostics)

  allDiagnostics.forEach(diagnostic => {
    if (diagnostic.file) {
      let { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
        diagnostic.start!
      )
      let message = ts.flattenDiagnosticMessageText(
        diagnostic.messageText,
        '\n'
      )
      console.log(
        `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`
      )
    } else {
      console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
    }
  })
  process.exit(allDiagnostics.length === 0 ? 0 : 1)
}

const tsconfig = ts.readConfigFile('tsconfig.json', filename =>
  fs.readFileSync(filename, 'utf8')
)

compile(process.argv.slice(2), {
  ...tsconfig.config,
  noEmit: true,
})
