import { createWriteStream, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { ZipFile } from 'yazl'

const root = resolve(import.meta.dirname, '..')
// Optional paths let the package check exercise a temporary, nested fixture.
const dist = resolve(process.argv[2] || resolve(root, 'dist'))
const manifestPath = resolve(dist, 'manifest.json')

if (!existsSync(dist) || !existsSync(manifestPath)) throw new Error('dist/manifest.json is missing; run the build first')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
if (typeof manifest.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(manifest.version)) throw new Error('dist/manifest.json has no valid version')
const packageName = dist.endsWith('dist-firefox') ? `promptab-firefox-${manifest.version}.zip` : `promptab-${manifest.version}.zip`
const output = resolve(process.argv[3] || resolve(root, 'store', packageName))
mkdirSync(dirname(output), { recursive: true })
rmSync(output, { force: true })

const zip = new ZipFile()
function addDirectory(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    const name = relative(dist, path).split(sep).join('/')
    if (entry.isDirectory()) { zip.addEmptyDirectory(name); addDirectory(path) }
    else if (entry.isFile()) zip.addFile(path, name)
  }
}
addDirectory(dist)
zip.end()
await pipeline(zip.outputStream, createWriteStream(output))
console.log(`Created ${output}`)
