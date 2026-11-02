import { readdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { galleryColors, MAX_GALLERY_BYTES, validateGalleryPack } from '../src/core/gallery/catalog'

const root = resolve('docs/gallery')
const files = (await readdir(resolve(root, 'packs'))).filter(file => file.endsWith('.json')).sort()
const defaultLayout = { rows: 2, columns: 1, cells: [
  { row: 1, column: 1, rowSpan: 1, columnSpan: 1, widgets: ['clock', 'date', 'search'] },
  { row: 2, column: 1, rowSpan: 1, columnSpan: 1, widgets: ['bookmarks'] },
] }
function previewLayout(pack: any) {
  if (!pack.layout?.areas) return defaultLayout
  const grid: string[][] = pack.layout.areas.map((row: string) => row.trim().split(/\s+/))
  const rows = grid.length, columns = grid[0]?.length ?? 0
  if (!rows || rows > 16 || !columns || columns > 16 || grid.some(row => row.length !== columns)) return defaultLayout
  const names = [...new Set(grid.flat().filter(name => name !== '.'))]
  const cells = names.map(name => {
    const positions = grid.flatMap((row, r) => row.flatMap((value, c) => value === name ? [{ r, c }] : []))
    const row = Math.min(...positions.map(p => p.r)), column = Math.min(...positions.map(p => p.c))
    return { row: row + 1, column: column + 1, rowSpan: Math.max(...positions.map(p => p.r)) - row + 1, columnSpan: Math.max(...positions.map(p => p.c)) - column + 1,
      widgets: pack.widgets.filter((widget: any) => widget.area === name && !widget.hidden).sort((a: any, b: any) => a.order - b.order).slice(0, 16).map((widget: any) => widget.type) }
  })
  return { rows, columns, cells }
}
const entries = []
for (const file of files) {
  if (!/^[a-z0-9-]+\.json$/.test(file)) throw new Error(`${file}: invalid pack filename`)
  const source = await readFile(resolve(root, 'packs', file), 'utf8')
  if (Buffer.byteLength(source, 'utf8') > MAX_GALLERY_BYTES) throw new Error(`${file}: pack exceeds size limit`)
  let pack: any
  try { pack = JSON.parse(source) } catch { throw new Error(`${file}: invalid JSON`) }
  const errors = validateGalleryPack(pack)
  if (errors.length) throw new Error(`${file}: ${errors.join('; ')}`)
  entries.push({ id: file.slice(0, -5), name: pack.meta.name, author: pack.meta.author, tags: pack.meta.tags, prompt: pack.meta.prompt, colors: galleryColors(pack.theme), mode: pack.theme.mode, layout: previewLayout(pack), file: `packs/${file}` })
}
if (entries.length < 12) throw new Error('Gallery requires at least 12 packs')
const index = JSON.stringify({ version: 2, packs: entries }, null, 2) + '\n'
const path = resolve(root, 'index.json')
if (process.argv.includes('--check')) {
  if ((await readFile(path, 'utf8').catch(() => '')).replace(/\r\n/g, '\n') !== index.replace(/\r\n/g, '\n')) throw new Error('Gallery index is out of date; run npx vite-node scripts/gallery-index.ts')
} else await writeFile(path, index)
console.log(`Validated ${entries.length} gallery packs${process.argv.includes('--check') ? ' and index' : '; index generated'}.`)
