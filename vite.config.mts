import { defineConfig } from 'vite'
import monkey from 'vite-plugin-monkey'
import manifest from './src/jma/manifest.json' with { type: 'json' }

export default defineConfig(({ command, mode }) => {
  const development = mode === 'development'
  const version = process.env.VERSION
  if (command === 'build' && !development && !version) {
    throw new Error(
      'VERSION is required for building userscript. Run: VERSION=YYYYMMDD npm run build',
    )
  }
  const grant = manifest.grant
  if (grant !== 'none') {
    throw new Error('This userscript must keep @grant none.')
  }

  return {
    build: {
      target: 'es2022',
      outDir: development ? '.dev' : 'dist',
      minify: false,
    },
    plugins: [
      monkey({
        entry: 'src/jma/main.ts',
        userscript: {
          ...manifest,
          name: development ? `[dev] ${manifest.name}` : manifest.name,
          grant,
          version: development ? '0.0.0' : (version ?? '0.0.0'),
          ...(development ? { updateURL: undefined, downloadURL: undefined } : {}),
        },
        build: {
          fileName: development ? 'jma.dev.user.js' : 'jma.user.js',
          autoGrant: false,
        },
      }),
    ],
  }
})
