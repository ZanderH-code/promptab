/** Regenerates docs/ai from the schema, the CSS API list and the bundled examples: `npm run docs:ai`. */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { buildDocs } from '../src/core/ai/docs'

const root = join(import.meta.dirname, '..', 'docs', 'ai')
for (const [path, content] of Object.entries(buildDocs())) {
  const target = join(root, path)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, content)
  console.log('wrote docs/ai/' + path)
}
