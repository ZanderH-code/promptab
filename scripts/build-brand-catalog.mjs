import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import * as icons from 'simple-icons'

const output = resolve(import.meta.dirname, '..', process.argv[2] ?? 'dist', 'brand-catalog.json')
const catalog = Object.values(icons).map(({ title, slug, path, hex }) => ({ title, slug, path, hex }))
await writeFile(output, `${JSON.stringify(catalog)}\n`)
console.log(`Created brand catalog with ${catalog.length} icons`)
