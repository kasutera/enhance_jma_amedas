import { defineConfig } from 'vite'
import monkey from 'vite-plugin-monkey'
import manifest from './src/jma/manifest.json' with { type: 'json' }

export default defineConfig(({ command }) => {
  const version = process.env.VERSION
  if (command === 'build' && !version) {
    throw new Error(
      'VERSION is required for building userscript. Run: VERSION=YYYYMMDD npm run build',
    )
  }
  const grant = manifest.grant
  if (grant !== 'none') {
    throw new Error('This userscript must keep @grant none.')
  }

  return {
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
    },
    build: {
      target: 'es2022',
      minify: false,
    },
    plugins: [
      monkey({
        entry: 'src/jma/main.ts',
        userscript: {
          ...manifest,
          grant,
          version: version ?? '0.0.0',
          ...(command === 'serve' ? { updateURL: undefined, downloadURL: undefined } : {}),
        },
        server: {
          open: false,
          prefix: (name) => `[dev] ${name}`,
        },
        build: {
          fileName: 'jma.user.js',
          autoGrant: false,
        },
      }),
    ],
  }
})
