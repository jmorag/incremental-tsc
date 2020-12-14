#!/usr/bin/env node
import ts from 'typescript'
import * as fs from 'fs'
import yargs from 'yargs'
import fetch from 'node-fetch'
import { URL } from 'url'
import chalk from 'chalk'
import { execFileSync } from 'child_process'

// This represents the + section of the @@ header of a patch
const patchHeaderRegex = /@@\s-\d+,\d+\s\+(?<start>\d+),(?<extent>\d+)\s@@/g
interface File {
  fileName: string
  lines?: { start: number; extent: number }[]
}

// taken from https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API
function check(files: File[], options: ts.CompilerOptions): void {
  if (files.length === 0) {
    console.log('No typescript files changed')
    process.exit(0)
  }

  const fileNames = files.map((f) => f.fileName)
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
      const { lines } = files.find((f) => f.fileName === fileName)
      if (
        lines === undefined ||
        lines.some((l) => line >= l.start && line + 1 - l.start <= l.extent)
      ) {
        const message = getMessageText(diagnostic)
        console.log(
          chalk.underline.bold(`${fileName} (${line + 1},${character + 1}):`) +
            ` ${message}`
        )
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

async function parseArgs(args: string[], useLines: boolean): Promise<File[]> {
  try {
    const github_pr_url = new URL(args[0])
    return getPRFiles(github_pr_url, useLines)
  } catch (_) {
    return args.map((arg) => {
      let lines = undefined
      if (useLines) {
        lines = []
        const diffOutput: string = execFileSync(
          'git',
          ['diff', '--staged', '--color=never', arg],
          { encoding: 'utf8' }
        )
        for (const l of diffOutput.matchAll(patchHeaderRegex) || []) {
          lines.push(l.groups)
        }
      }
      return { fileName: arg, lines }
    })
  }
}

async function getPRFiles(url: URL, useLines: boolean): Promise<File[]> {
  const gh_user = process.env['GITHUB_USER']
  const gh_password = process.env['GITHUB_PASSWORD']
  const auth_header =
    'Basic ' + Buffer.from(gh_user + ':' + gh_password).toString('base64')
  const resp = await fetch(url, { headers: { Authorization: auth_header } })
  const data = await resp.json()
  if (data?.message === 'Not Found') {
    throw 'PR data not found'
  }

  return parsePRData(data, useLines)
}

function parsePRData(data: any, useLines: boolean): File[] {
  return data
    .filter(
      ({ filename, status }) =>
        filename.match(/\.tsx?$/) &&
        ['added', 'modified', 'renamed'].includes(status)
    )
    .map((change: { filename: string; patch?: string }) => {
      const fileName = change.filename
      let lines = undefined
      if (useLines) {
        lines = []
        for (const l of change.patch?.matchAll(patchHeaderRegex) || []) {
          lines.push(l.groups)
        }
      }
      return { fileName, lines }
    })
}

async function main() {
  const argv = yargs(process.argv.slice(2))
    .demandCommand(1)
    .default('tsconfig', './tsconfig.json')
    .default('tsconfig-paths', './tsconfig.paths.json')
    .boolean(['changed-lines-only'])
    .usage(
      'Usage: $0 src/components/*.tsx OR $0 https://api.github.com/repos/<username>/<repo>/pulls/<prnum>/files [--changed-lines-only]'
    ).argv

  const options = {
    ...readConfig(argv['tsconfig-paths']),
    ...readConfig(argv.tsconfig),
    noEmit: true,
  }
  const args = await parseArgs(argv._, argv['changed-lines-only'])
  check(args, options)
}

main().catch((err) => {
  console.log(err)
  process.exit(1)
})
