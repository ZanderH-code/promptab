import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { verifyPackage } from './verify-package.mjs'

test('package uses portable entry names and contains all index assets', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'promptab-package-test-'))
  try {
    const dist = join(temp, 'dist'), archive = join(temp, 'package.zip')
    await mkdir(join(dist, 'assets', 'nested'), { recursive: true })
    await writeFile(join(dist, 'manifest.json'), JSON.stringify({ version: '1.2.3' }))
    await writeFile(join(dist, 'index.html'), '<script src="./assets/main.js"></script><link href="./assets/nested/style.css">')
    await writeFile(join(dist, 'assets', 'main.js'), 'export {}')
    await writeFile(join(dist, 'assets', 'nested', 'style.css'), 'body{}')
    execFileSync(process.execPath, [resolve('scripts/package-extension.mjs'), dist, archive], { stdio: 'pipe' })
    const result = await verifyPackage(archive)
    assert.ok(result.entries >= 4)
    assert.equal(result.assets, 2)
  } finally {
    await rm(temp, { recursive: true, force: true })
  }
})

async function buildFixtureArchive(manifest, jsCode) {
  const temp = await mkdtemp(join(tmpdir(), 'promptab-package-scan-'))
  const dist = join(temp, 'dist')
  const archive = join(temp, 'package.zip')
  await mkdir(join(dist, 'assets'), { recursive: true })
  await writeFile(join(dist, 'manifest.json'), JSON.stringify(manifest))
  await writeFile(join(dist, 'index.html'), '<script src="./assets/main.js"></script>')
  await writeFile(join(dist, 'assets', 'main.js'), jsCode)
  execFileSync(process.execPath, [resolve('scripts/package-extension.mjs'), dist, archive], { stdio: 'pipe' })
  return { temp, archive }
}

test('verifyPackage rejects a Chromium archive that hides storage or bookmarks behind indirect globals', async () => {
  const { temp, archive } = await buildFixtureArchive(
    { version: '1.2.3', permissions: ['storage'], optional_permissions: ['bookmarks'] },
    'const api = globalThis["chrome"]; export const s = api?.storage;',
  )
  try {
    await assert.rejects(verifyPackage(archive), /literal "chrome\.storage"/)
  } finally {
    await rm(temp, { recursive: true, force: true })
  }
})

test('verifyPackage accepts literal chrome.storage and chrome.bookmarks references', async () => {
  const { temp, archive } = await buildFixtureArchive(
    { version: '1.2.3', permissions: ['storage'], optional_permissions: ['bookmarks'] },
    'export const s = chrome.storage.local; export const b = () => chrome.bookmarks.getTree();',
  )
  try {
    const result = await verifyPackage(archive)
    assert.equal(result.assets, 1)
  } finally {
    await rm(temp, { recursive: true, force: true })
  }
})

test('verifyPackage checks browser.* literals for Firefox archives', async () => {
  const manifest = {
    version: '1.2.3',
    permissions: ['storage'],
    browser_specific_settings: { gecko: { id: 'promptab@example.test' } },
  }
  const missing = await buildFixtureArchive(manifest, 'export const s = chrome.storage.local;')
  const valid = await buildFixtureArchive(manifest, 'export const s = browser.storage.local;')
  try {
    await assert.rejects(verifyPackage(missing.archive), /literal "browser\.storage"/)
    const result = await verifyPackage(valid.archive)
    assert.equal(result.assets, 1)
  } finally {
    await rm(missing.temp, { recursive: true, force: true })
    await rm(valid.temp, { recursive: true, force: true })
  }
})
