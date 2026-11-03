import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('../dist-web', import.meta.url)))
const updateFixture = process.env.PROMPTAB_SW_UPDATE_TEST === '1'
let workerVersion = 'A'
const prefix = '/promptab/app/'
const types = {
  '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2',
}

createServer(async (request, response) => {
  const pathname = new URL(request.url ?? '/', 'http://localhost').pathname
  if (updateFixture && pathname === `${prefix}__test__/worker-version` && request.method === 'POST') {
    workerVersion = 'B'
    response.writeHead(204, { 'cache-control': 'no-store' }).end()
    return
  }
  if (updateFixture && pathname === `${prefix}sw.js`) {
    const { readFile } = await import('node:fs/promises')
    const worker = await readFile(resolve(root, 'sw.js'), 'utf8')
    const versionResponder = `\nself.addEventListener('message', event => { if (event.data?.type === 'TEST_VERSION' && event.ports[0]) event.ports[0].postMessage('${workerVersion}') })\n`
    response.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-store' }).end(worker + versionResponder)
    return
  }
  if (updateFixture && pathname.startsWith('/promptab/gallery/')) {
    const galleryRoot = resolve(fileURLToPath(new URL('../docs/gallery', import.meta.url)))
    const relative = decodeURIComponent(pathname.slice('/promptab/gallery/'.length)).replaceAll('/', sep)
    const galleryFile = resolve(galleryRoot, relative || 'index.html')
    if (!galleryFile.startsWith(`${galleryRoot}${sep}`)) { response.writeHead(403).end(); return }
    try { await stat(galleryFile) } catch { response.writeHead(404).end(); return }
    response.writeHead(200, { 'content-type': types[extname(galleryFile)] ?? 'application/octet-stream', 'cache-control': 'no-cache' })
    createReadStream(galleryFile).pipe(response)
    return
  }
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
