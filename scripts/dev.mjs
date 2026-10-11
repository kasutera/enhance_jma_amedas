import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { build } from 'vite'

const port = Number(process.env.PORT ?? 5173)
const output = new URL('../.dev/jma.dev.user.js', import.meta.url)
const ready = Promise.withResolvers()
let userscript

const watcher = await build({ mode: 'development', build: { watch: {} } })
watcher.on('event', async (event) => {
  if (event.code === 'ERROR') {
    ready.reject(event.error)
  } else if (event.code === 'END') {
    try {
      // ビルド完了後の内容だけを配信し、再ビルド中の書きかけを返さない。
      userscript = await readFile(output)
      ready.resolve()
    } catch (error) {
      console.error('開発版userscriptの読み取りに失敗しました:', error)
      ready.reject(error)
    }
  }
})

const server = createServer((request, response) => {
  response.setHeader('Cache-Control', 'no-store')
  const pathname = new URL(request.url, 'http://127.0.0.1:5173').pathname
  if (pathname === '/jma.dev.user.js') {
    response.writeHead(200, {
      'Content-Type': 'application/javascript; charset=utf-8',
    })
    response.end(userscript)
  } else if (pathname === '/') {
    response.writeHead(302, { Location: '/jma.dev.user.js' })
    response.end()
  } else {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    response.end('Not Found')
  }
})

await ready.promise
server.listen(port, '127.0.0.1', () => {
  console.log(`\nhttp://127.0.0.1:${port}/\n`)
})

async function stop() {
  server.close()
  await watcher.close()
}
process.once('SIGINT', stop)
process.once('SIGTERM', stop)
