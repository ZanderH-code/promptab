/** Regenerates docs/ai from the schema, the CSS API list and the bundled examples: `npm run docs:ai`. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { buildDocs } from '../src/core/ai/docs'

const root = join(import.meta.dirname, '..', 'docs', 'ai')
const check = process.argv.includes('--check')
let stale = false
for (const [path, content] of Object.entries(buildDocs())) {
  const target = join(root, path)
  if (check) {
    try {
      if (readFileSync(target, 'utf8').replace(/\r\n/g, '\n') !== content.replace(/\r\n/g, '\n')) throw new Error('stale')
    } catch {
      console.error('docs/ai/' + path + ' is stale; run npm run docs:ai')
      stale = true
    }
    continue
  }
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, content)
  console.log('wrote docs/ai/' + path)
}
if (check && stale) process.exitCode = 1
