import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import { templateGrid } from '../src/core/layout/templates'

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
      expect(index.version).toBe(2)
      expect(index.packs).toHaveLength(20)
      const packs = index.packs.map((entry: { file: string }) => JSON.parse(readFileSync(resolve(dir, 'docs/gallery', entry.file), 'utf8')))
      expect(packs.filter((pack: any) => ['gradient', 'accent'].includes(pack.background?.type)).length).toBeGreaterThanOrEqual(6)
      expect(packs.filter((pack: any) => pack.layout && pack.widgets).length).toBeGreaterThanOrEqual(5)
      expect(packs.filter((pack: any) => typeof pack.css === 'string' && pack.css.trim()).length).toBeGreaterThanOrEqual(4)
      expect(packs.filter((pack: any) => pack.variables?.length).length).toBeGreaterThanOrEqual(2)
      expect(new Set(packs.map((pack: any) => pack.meta.prompt.en)).size).toBe(packs.length)
      // Built-in dashboard geometry does not need to be duplicated by a gallery theme pack.
      for (const template of ['split', 'icon-split', 'banner', 'top-grid', 'dashboard'] as const) expect(packs.some((pack: any) => JSON.stringify(pack.layout?.areas) === JSON.stringify(templateGrid(template).areas)), template).toBe(true)
      for (const pack of packs.filter((pack: any) => pack.layout)) expect(pack.widgets.some((widget: any) => widget.type === 'bookmarks' && !widget.hidden)).toBe(true)
      for (const entry of index.packs) {
        const pack = JSON.parse(readFileSync(resolve(dir, 'docs/gallery', entry.file), 'utf8'))
        expect(entry.colors).toEqual(entry.mode === 'light' ? (pack.theme.colorLight ?? pack.theme.color) : pack.theme.color)
        expect(entry.layout).toBeDefined()
        if (pack.layout) {
          const firstArea = pack.layout.areas[0].trim().split(/\s+/)[0]
          if (firstArea !== '.') expect(entry.layout.cells.some((cell: any) => cell.row === 1 && cell.column === 1 && cell.widgets.includes(pack.widgets.find((widget: any) => widget.area === firstArea && !widget.hidden)?.type))).toBe(true)
        } else expect(entry.layout.cells.map((cell: any) => cell.widgets)).toEqual([['clock', 'date', 'search'], ['bookmarks']])
      }
      expect(index.packs.some((entry: { mode: string }) => entry.mode === 'light')).toBe(true)
      expect(index.packs.some((entry: { mode: string }) => entry.mode === 'dark')).toBe(true)
      expect(run().status).toBe(0)
      expect(readFileSync(path, 'utf8')).toBe(first)
      expect(run('--check').status).toBe(0)
      writeFileSync(path, first.replace(/\n/g, '\r\n'))
      expect(run('--check').status).toBe(0)
      writeFileSync(path, '{}\n')
      const stale = run('--check')
      expect(stale.status).not.toBe(0)
      expect(stale.stderr).toContain('out of date')
    } finally { rmSync(dir, { recursive: true, force: true }) }
  }, 30000)
})
