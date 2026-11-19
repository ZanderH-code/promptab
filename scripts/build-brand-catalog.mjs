// Writes the brand data the app fetches at run time: the domain index and the per-slug
// shards. The icon picker reads the shards too, so no separate full catalog is emitted.
import * as icons from 'simple-icons'
import { writeBrandIndex } from './build-brand-index.mjs'
import { writeBrandShards } from './build-brand-shards.mjs'

const outDir = process.argv[2] ?? 'dist'
const index = await writeBrandIndex(outDir)
console.log(`Created brand index with ${index.hosts} hosts and ${index.paths} path rules (${index.bytes} bytes)`)

const shards = await writeBrandShards(icons, outDir)
console.log(`Created ${shards.count} brand shards (largest ${shards.maxBytes} bytes, ${shards.totalBytes} bytes total)`)
