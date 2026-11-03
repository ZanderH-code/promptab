import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve('docs/gallery')
const index = JSON.parse(await readFile(resolve(root, 'index.json'), 'utf8'))
const expected = index.packs.map(item => `${item.id}.png`).sort()
const actual = (await readdir(resolve(root, 'previews'))).sort()
if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Gallery previews do not match packs: expected ${expected.join(', ')}; got ${actual.join(', ')}`)
for (const name of actual) {
  const bytes = await readFile(resolve(root, 'previews', name))
  if (bytes.readUInt32BE(16) !== 640 || bytes.readUInt32BE(20) !== 400) throw new Error(`${name} is not 640x400`)
}
console.log(`Verified ${actual.length} gallery previews`)
