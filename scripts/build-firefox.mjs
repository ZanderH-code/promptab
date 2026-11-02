import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const source = resolve(root, 'dist')
const target = resolve(root, 'dist-firefox')
const chromiumManifest = JSON.parse(await readFile(resolve(source, 'manifest.json'), 'utf8'))
if (!chromiumManifest.version) throw new Error('Build the Chromium extension before creating the Firefox build')
const firefoxManifest = {
  ...chromiumManifest,
  permissions: chromiumManifest.permissions.filter(permission => permission !== 'favicon'),
  browser_specific_settings: {
    gecko: {
      id: 'promptab@zanderh-code.github.io',
      strict_min_version: '140.0',
      data_collection_permissions: {
        required: ['none'],
        optional: ['authenticationInfo', 'personalCommunications'],
      },
    },
  },
}
await rm(target, { recursive: true, force: true })
await mkdir(target, { recursive: true })
await cp(source, target, { recursive: true })
await writeFile(resolve(target, 'manifest.json'), `${JSON.stringify(firefoxManifest, null, 2)}\n`)
console.log(`Created Firefox extension directory ${target}`)
