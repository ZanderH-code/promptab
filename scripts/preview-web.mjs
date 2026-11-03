import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('../dist-web', import.meta.url)))
const prefix = '/promptab/app/'
const types = {
  '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2',
}

createServer(async (request, response) => {
  const pathname = new URL(request.url ?? '/', 'http://localhost').pathname
  if (pathname !== prefix.slice(0, -1) && !pathname.startsWith(prefix)) {
    response.writeHead(404).end('Not found')
    return
  }
  const relative = decodeURIComponent(pathname.slice(prefix.length)).replaceAll('/', sep)
  let file = resolve(root, relative || 'index.html')
  if (file !== root && !file.startsWith(`${root}${sep}`)) {
    response.writeHead(403).end('Forbidden')
    return
  }
  try {
    if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html')
    await stat(file)
  } catch {
    file = resolve(root, 'index.html')
  }
  response.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-cache' })
  if (request.method === 'HEAD') response.end()
  else createReadStream(file).pipe(response)
}).listen(4174, '127.0.0.1', () => console.log('Web preview at http://127.0.0.1:4174/promptab/app/'))
