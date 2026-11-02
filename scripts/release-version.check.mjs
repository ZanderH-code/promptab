import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { open } from 'yauzl'

const json = async path => JSON.parse(await readFile(path, 'utf8'))

async function archiveManifest(path) {
  return new Promise((resolve, reject) => {
    open(path, { lazyEntries: true, strictFileNames: true }, (error, zip) => {
      if (error) return reject(error)
      let found = false
      zip.on('error', reject)
      zip.on('entry', entry => {
        if (entry.fileName !== 'manifest.json') return zip.readEntry()
        found = true
        zip.openReadStream(entry, (streamError, stream) => {
          if (streamError) return reject(streamError)
          const chunks = []
          stream.on('data', chunk => chunks.push(chunk))
          stream.on('error', reject)
          stream.on('end', () => {
            try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))) }
            catch (parseError) { reject(parseError) }
            finally { zip.close() }
          })
        })
      })
      zip.on('end', () => { if (!found) reject(new Error(`${path} is missing manifest.json`)) })
      zip.readEntry()
    })
  })
}

test('release metadata, documentation, builds and archives use the same version', async () => {
  const source = await json('public/manifest.json')
  const packageJson = await json('package.json')
  const lock = await json('package-lock.json')
  const chromium = await json('dist/manifest.json')
  const firefox = await json('dist-firefox/manifest.json')
  const changelog = await readFile('CHANGELOG.md', 'utf8')
  const workflow = await readFile('.github/workflows/publish-edge.yml', 'utf8')
  const version = source.version
  assert.match(version, /^\d+\.\d+\.\d+$/)
  assert.equal(packageJson.version, version, 'package.json version')
  assert.equal(lock.version, version, 'package-lock.json version')
  assert.equal(lock.packages[''].version, version, 'package-lock root version')
  assert.equal(chromium.version, version, 'Chromium build version')
  assert.equal(firefox.version, version, 'Firefox build version')
  assert.ok(changelog.includes(`## [${version}]`), 'changelog must describe the current release')
  assert.equal(workflow.match(/^\s*EDGE_ADDONS_VERSION:\s*(\S+)\s*$/m)?.[1], version, 'Edge workflow version')
  for (const name of [`store/promptab-${version}.zip`, `store/promptab-firefox-${version}.zip`]) {
    assert.equal((await archiveManifest(name)).version, version, `${name} manifest version`)
  }
})
