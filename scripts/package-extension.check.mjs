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
