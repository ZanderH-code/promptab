import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const cli = resolve(root, 'node_modules/vite-node/vite-node.mjs')
const script = resolve(root, 'scripts/gallery-index.ts')

describe('gallery index generation', () => {
  it('generates deterministic active palettes and detects a stale index', () => {
    const dir = mkdtempSync(resolve(tmpdir(), 'promptab-gallery-'))
    try {
      cpSync(resolve(root, 'docs/gallery'), resolve(dir, 'docs/gallery'), { recursive: true })
      const run = (...args: string[]) => spawnSync(process.execPath, [cli, script, ...args], { cwd: dir, encoding: 'utf8' })
      expect(run().status).toBe(0)
      const path = resolve(dir, 'docs/gallery/index.json')
      const first = readFileSync(path, 'utf8')
      const index = JSON.parse(first)
      expect(index.packs.length).toBeGreaterThanOrEqual(12)
      for (const entry of index.packs) {
        const pack = JSON.parse(readFileSync(resolve(dir, 'docs/gallery', entry.file), 'utf8'))
        expect(entry.colors).toEqual(entry.mode === 'light' ? (pack.theme.colorLight ?? pack.theme.color) : pack.theme.color)
      }
      expect(index.packs.some((entry: { mode: string }) => entry.mode === 'light')).toBe(true)
      expect(index.packs.some((entry: { mode: string }) => entry.mode === 'dark')).toBe(true)
      expect(run().status).toBe(0)
      expect(readFileSync(path, 'utf8')).toBe(first)
      expect(run('--check').status).toBe(0)
      writeFileSync(path, '{}\n')
      const stale = run('--check')
      expect(stale.status).not.toBe(0)
      expect(stale.stderr).toContain('out of date')
    } finally { rmSync(dir, { recursive: true, force: true }) }
  }, 30000)
})
