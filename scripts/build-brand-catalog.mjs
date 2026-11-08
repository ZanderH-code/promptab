import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import * as icons from 'simple-icons'
import { writeBrandIndex } from './build-brand-index.mjs'
import { writeBrandShards } from './build-brand-shards.mjs'

const outDir = process.argv[2] ?? 'dist'
const output = resolve(import.meta.dirname, '..', outDir, 'brand-catalog.json')
const catalog = Object.values(icons).map(({ title, slug, path, hex }) => ({ title, slug, path, hex }))
await writeFile(output, `${JSON.stringify(catalog)}\n`)
console.log(`Created brand catalog with ${catalog.length} icons`)

const index = await writeBrandIndex(outDir)
console.log(`Created brand index with ${index.hosts} hosts and ${index.paths} path rules (${index.bytes} bytes)`)

const shards = await writeBrandShards(icons, outDir)
console.log(`Created ${shards.count} brand shards (largest ${shards.maxBytes} bytes, ${shards.totalBytes} bytes total)`)
