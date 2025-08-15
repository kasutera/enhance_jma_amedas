import { readFileSync } from 'node:fs'
import typescript from '@rollup/plugin-typescript'
import replace from '@rollup/plugin-replace'
import glob from 'glob'
import type { RollupOptions } from 'rollup'
import cleanup from 'rollup-plugin-cleanup'
import { stringify } from 'userscript-metadata'
import type { Metadata } from 'userscript-metadata'

const getVersion = (): string => {
  const version = process.env.VERSION
  
  if (!version) {
    console.error('ERROR: VERSION environment variable is required for building userscript')
    console.error('Please run: VERSION=YYYYMMDD npm run build')
    process.exit(1)
  }
  
  return version
}

const readMetadata = (path: string): Metadata => {
  const content = readFileSync(path, 'utf8')
  const version = getVersion()
  return JSON.parse(content.replace('__VERSION__', version))
}
const rootDir = process.cwd()
const entryPaths = glob.sync('src/**/main.ts')
const configs: RollupOptions[] = entryPaths.flatMap(entryPath => {
  const manifestPath = entryPath.replace(/\/main\.ts$/, '/manifest.json')
  const mainScriptPath = entryPath.replace(/^src\//, 'dist/').replace(/\/(.+)\/main\.ts$/, '/$1.user.js')
  const mainScriptUrl = `file://${rootDir}/${mainScriptPath}`
  const devScriptPath = entryPath.replace(/^src\//, 'dist/').replace(/\/(.+)\/main\.ts$/, '/$1.dev.user.js')
  const devify = (metadata: Metadata): Metadata => {
    const requires: string[] = []

    if (typeof metadata.require === 'string') {
      requires.push(metadata.require)
    } else if (Array.isArray(metadata.require)) {
      requires.push(...metadata.require)
    }

    requires.push(mainScriptUrl)
    return {
      ...metadata,
      name: `[dev] ${String(metadata.name)}`,
      require: requires
    }
  }
  const mainConfig: RollupOptions = {
    input: entryPath,
    output: {
      file: mainScriptPath,
      format: 'iife',
      banner: () => `${stringify(readMetadata(manifestPath))}\n`
    },
    plugins: [
      replace({
        __VERSION__: getVersion(),
        preventAssignment: true
      }),
      typescript(),
      cleanup({
        extensions: [
          'ts'
        ]
      })
    ]
  }
  const devConfig: RollupOptions = {
    input: 'src/dev.ts',
    output: {
      file: devScriptPath,
      banner: () => `${stringify(devify(readMetadata(manifestPath)))}\n`
    },
    plugins: [
      replace({
        __VERSION__: getVersion(),
        preventAssignment: true
      }),
      typescript(),
      cleanup({
        extensions: [
          'ts'
        ]
      })
    ]
  }
  return [
    mainConfig,
    devConfig
  ]
})

export default configs
