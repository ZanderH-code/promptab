import { readdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { galleryColors, MAX_GALLERY_BYTES, validateGalleryPack } from '../src/core/gallery/catalog'

const root = resolve('docs/gallery')
const files = (await readdir(resolve(root, 'packs'))).filter(file => file.endsWith('.json')).sort()
const entries = []
for (const file of files) {
  if (!/^[a-z0-9-]+\.json$/.test(file)) throw new Error(`${file}: invalid pack filename`)
  const source = await readFile(resolve(root, 'packs', file), 'utf8')
  if (Buffer.byteLength(source, 'utf8') > MAX_GALLERY_BYTES) throw new Error(`${file}: pack exceeds size limit`)
  let pack: any
  try { pack = JSON.parse(source) } catch { throw new Error(`${file}: invalid JSON`) }
  const errors = validateGalleryPack(pack)
  if (errors.length) throw new Error(`${file}: ${errors.join('; ')}`)
  entries.push({ id: file.slice(0, -5), name: pack.meta.name, author: pack.meta.author, tags: pack.meta.tags, prompt: pack.meta.prompt, colors: galleryColors(pack.theme), mode: pack.theme.mode, file: `packs/${file}` })
}
if (entries.length < 12) throw new Error('Gallery requires at least 12 packs')
const index = JSON.stringify({ version: 1, packs: entries }, null, 2) + '\n'
const path = resolve(root, 'index.json')
if (process.argv.includes('--check')) {
  if ((await readFile(path, 'utf8').catch(() => '')).replace(/\r\n/g, '\n') !== index.replace(/\r\n/g, '\n')) throw new Error('Gallery index is out of date; run npx vite-node scripts/gallery-index.ts')
} else await writeFile(path, index)
console.log(`Validated ${entries.length} gallery packs${process.argv.includes('--check') ? ' and index' : '; index generated'}.`)
