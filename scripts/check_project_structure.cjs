#!/usr/bin/env node

const fs = require('node:fs')
const path = require('node:path')

const rootDir = process.cwd()
const srcJmaDir = path.join(rootDir, 'src', 'jma')
const errors = []

const tableModuleFiles = [
  'dom_handler.ts',
  'dom_generators.ts',
  'jma_amedas_fetcher.ts',
  'presentation.ts',
]
const sharedFeatureModules = new Set(['color_scale'])
const snakeCasePattern = /^[a-z][a-z0-9_]*$/
const tsFilePattern = /^[a-z][a-z0-9_]*(\.test)?\.ts$/

const toPosix = (filePath) => filePath.split(path.sep).join('/')
const fromRoot = (filePath) => toPosix(path.relative(rootDir, filePath))
const fromSrcJma = (filePath) => toPosix(path.relative(srcJmaDir, filePath))

const addError = (message) => {
  errors.push(message)
}

const walk = (dir) => {
  if (!fs.existsSync(dir)) {
    return []
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true })
  return entries.flatMap((entry) => {
    const entryPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      return walk(entryPath)
    }
    return [entryPath]
  })
}

const getFeatureDir = (filePath) => {
  const parts = fromSrcJma(filePath).split('/')
  return parts.length > 1 ? parts[0] : null
}

const resolveRelativeImport = (fromFile, specifier) => {
  if (!specifier.startsWith('.')) {
    return null
  }

  const basePath = path.resolve(path.dirname(fromFile), specifier)
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    path.join(basePath, 'index.ts'),
    path.join(basePath, 'index.tsx'),
  ]

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null
}

const collectImportSpecifiers = (source) => {
  const specifiers = []
  const fromPattern = /\bfrom\s+['"]([^'"]+)['"]/g
  const sideEffectPattern = /^\s*import\s+['"]([^'"]+)['"]/gm

  for (const match of source.matchAll(fromPattern)) {
    specifiers.push(match[1])
  }

  for (const match of source.matchAll(sideEffectPattern)) {
    specifiers.push(match[1])
  }

  return specifiers
}

if (!fs.existsSync(srcJmaDir)) {
  addError('src/jma が見つかりません')
}

const allFiles = walk(srcJmaDir)
const tsFiles = allFiles.filter((filePath) => filePath.endsWith('.ts'))
const productionTsFiles = tsFiles.filter((filePath) => !filePath.endsWith('.test.ts'))
const featureDirs = fs
  .readdirSync(srcJmaDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)

for (const featureDir of featureDirs) {
  if (!snakeCasePattern.test(featureDir)) {
    addError(
      `${fromRoot(path.join(srcJmaDir, featureDir))}: feature directory は snake_case にしてください`,
    )
  }
}

for (const tsFile of tsFiles) {
  if (!tsFilePattern.test(path.basename(tsFile))) {
    addError(`${fromRoot(tsFile)}: TypeScript ファイル名は snake_case にしてください`)
  }
}

for (const testFile of tsFiles.filter((filePath) => filePath.endsWith('.test.ts'))) {
  const sourceFile = testFile.replace(/\.test\.ts$/, '.ts')
  if (!fs.existsSync(sourceFile)) {
    addError(`${fromRoot(testFile)}: 対応する ${path.basename(sourceFile)} が見つかりません`)
  }
}

for (const featureDir of featureDirs) {
  const absoluteFeatureDir = path.join(srcJmaDir, featureDir)
  const isTableModule = tableModuleFiles.some((fileName) =>
    fs.existsSync(path.join(absoluteFeatureDir, fileName)),
  )

  if (!isTableModule) {
    continue
  }

  const mainFile = path.join(absoluteFeatureDir, `${featureDir}_main.ts`)
  if (!fs.existsSync(mainFile)) {
    addError(`${fromRoot(absoluteFeatureDir)}: ${featureDir}_main.ts が見つかりません`)
  }

  for (const fileName of tableModuleFiles) {
    const sourceFile = path.join(absoluteFeatureDir, fileName)
    const testFile = sourceFile.replace(/\.ts$/, '.test.ts')

    if (!fs.existsSync(sourceFile)) {
      addError(`${fromRoot(absoluteFeatureDir)}: ${fileName} が見つかりません`)
      continue
    }

    if (!fs.existsSync(testFile)) {
      addError(`${fromRoot(sourceFile)}: 対応する ${path.basename(testFile)} が見つかりません`)
    }
  }
}

for (const filePath of allFiles) {
  const extension = path.extname(filePath)
  const featureDir = getFeatureDir(filePath)
  if (!featureDir || (extension !== '.html' && extension !== '.json')) {
    continue
  }

  if (!fromSrcJma(filePath).includes('/testcases/')) {
    addError(`${fromRoot(filePath)}: fixture は testcases/ 配下に置いてください`)
  }
}

for (const testFile of tsFiles.filter((filePath) => filePath.endsWith('.test.ts'))) {
  const source = fs.readFileSync(testFile, 'utf8')
  const fixtureReferencePattern = /(['"`])([^'"`]*(?:\.html|\.json))\1/g

  for (const match of source.matchAll(fixtureReferencePattern)) {
    const reference = match[2]
    const isLocalReference =
      reference.startsWith('.') || reference.startsWith('/') || reference.includes('__dirname')

    if (isLocalReference && !reference.includes('testcases/')) {
      addError(
        `${fromRoot(testFile)}: fixture 参照は testcases/ 配下を指してください (${reference})`,
      )
    }
  }
}

const graph = new Map()

for (const sourceFile of productionTsFiles) {
  const source = fs.readFileSync(sourceFile, 'utf8')
  const imports = collectImportSpecifiers(source)
  const dependencies = []

  for (const specifier of imports) {
    const target = resolveRelativeImport(sourceFile, specifier)
    if (!target?.startsWith(srcJmaDir) || !target.endsWith('.ts')) {
      continue
    }

    const sourceFeature = getFeatureDir(sourceFile)
    const targetFeature = getFeatureDir(target)
    if (
      sourceFeature &&
      targetFeature &&
      sourceFeature !== targetFeature &&
      !sharedFeatureModules.has(targetFeature)
    ) {
      addError(
        `${fromRoot(sourceFile)}: feature 間の直接 import は避けてください (${specifier})。共有コードは src/jma/ 直下へ移してください`,
      )
    }

    dependencies.push(target)
  }

  graph.set(sourceFile, dependencies)
}

const visitState = new Map()

const detectCycle = (node, stack) => {
  visitState.set(node, 'visiting')

  for (const dependency of graph.get(node) ?? []) {
    if (!graph.has(dependency)) {
      continue
    }

    if (visitState.get(dependency) === 'visiting') {
      const cycleStart = stack.indexOf(dependency)
      const cycle = [...stack.slice(cycleStart), dependency].map(fromRoot).join(' -> ')
      addError(`循環依存を検出しました: ${cycle}`)
      continue
    }

    if (!visitState.has(dependency)) {
      detectCycle(dependency, [...stack, dependency])
    }
  }

  visitState.set(node, 'visited')
}

for (const sourceFile of graph.keys()) {
  if (!visitState.has(sourceFile)) {
    detectCycle(sourceFile, [sourceFile])
  }
}

if (errors.length > 0) {
  console.error('Project structure check failed:')
  for (const error of errors) {
    console.error(`- ${error}`)
  }
  process.exit(1)
}

console.log('Project structure check passed.')
