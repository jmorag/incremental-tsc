import * as ts from 'typescript'
import * as fs from 'fs'

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
}

const tsconfig = ts.readConfigFile('tsconfig.json', filename =>
  fs.readFileSync(filename, 'utf8')
)

compile(process.argv.slice(2), {
  ...tsconfig.config,
  noEmit: true,
})
