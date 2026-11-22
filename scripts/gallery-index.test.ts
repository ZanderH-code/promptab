import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import { templateGrid } from '../src/core/layout/templates'
import { syncGalleryIndex } from './gallery-index-lib'

const root = process.cwd()
const cli = resolve(root, 'node_modules/vite-node/vite-node.mjs')
const script = resolve(root, 'scripts/gallery-index.ts')

describe('gallery index generation', () => {
  it('generates deterministic active palettes and detects a stale index', async () => {
    const dir = mkdtempSync(resolve(tmpdir(), 'promptab-gallery-'))
    const galleryDir = resolve(dir, 'docs/gallery')
    try {
      cpSync(resolve(root, 'docs/gallery'), galleryDir, { recursive: true })
      const generated = await syncGalleryIndex(galleryDir)
      const path = generated.path
      const first = readFileSync(path, 'utf8')
      const index = JSON.parse(first)
      expect(index.version).toBe(2)
      expect(index.packs).toHaveLength(20)
      const packs = index.packs.map((entry: { file: string }) =>
        JSON.parse(readFileSync(resolve(galleryDir, entry.file), 'utf8')),
      )
      expect(packs.filter((pack: any) => ['gradient', 'accent'].includes(pack.background?.type)).length).toBeGreaterThanOrEqual(6)
      expect(packs.filter((pack: any) => pack.layout && pack.widgets).length).toBeGreaterThanOrEqual(5)
      expect(packs.filter((pack: any) => typeof pack.css === 'string' && pack.css.trim()).length).toBeGreaterThanOrEqual(4)
      expect(packs.filter((pack: any) => pack.variables?.length).length).toBeGreaterThanOrEqual(2)
      expect(new Set(packs.map((pack: any) => pack.meta.prompt.en)).size).toBe(packs.length)
      // Built-in dashboard geometry does not need to be duplicated by a gallery theme pack.
      for (const template of ['split', 'icon-split', 'banner', 'top-grid', 'dashboard'] as const) {
        expect(packs.some((pack: any) => JSON.stringify(pack.layout?.areas) === JSON.stringify(templateGrid(template).areas)), template).toBe(true)
      }
      for (const pack of packs.filter((pack: any) => pack.layout)) {
        expect(pack.widgets.some((widget: any) => widget.type === 'bookmarks' && !widget.hidden)).toBe(true)
      }
      for (const entry of index.packs) {
        const pack = JSON.parse(readFileSync(resolve(galleryDir, entry.file), 'utf8'))
        expect(entry.colors).toEqual(entry.mode === 'light' ? (pack.theme.colorLight ?? pack.theme.color) : pack.theme.color)
        expect(entry.layout).toBeDefined()
        if (pack.layout) {
          const firstArea = pack.layout.areas[0].trim().split(/\s+/)[0]
          if (firstArea !== '.') {
            expect(
              entry.layout.cells.some(
                (cell: any) =>
                  cell.row === 1 &&
                  cell.column === 1 &&
                  cell.widgets.includes(pack.widgets.find((widget: any) => widget.area === firstArea && !widget.hidden)?.type),
              ),
            ).toBe(true)
          }
        } else {
          expect(entry.layout.cells.map((cell: any) => cell.widgets)).toEqual([['clock', 'date', 'search'], ['bookmarks']])
        }
      }
      expect(index.packs.some((entry: { mode: string }) => entry.mode === 'light')).toBe(true)
      expect(index.packs.some((entry: { mode: string }) => entry.mode === 'dark')).toBe(true)

      await syncGalleryIndex(galleryDir)
      expect(readFileSync(path, 'utf8')).toBe(first)
      await expect(syncGalleryIndex(galleryDir, { check: true })).resolves.toMatchObject({ count: 20 })

      writeFileSync(path, first.replace(/\n/g, '\r\n'))
      await expect(syncGalleryIndex(galleryDir, { check: true })).resolves.toMatchObject({ count: 20 })

      writeFileSync(path, '{}\n')
      await expect(syncGalleryIndex(galleryDir, { check: true })).rejects.toThrow('out of date')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('passes CLI --check from the repository root', () => {
    const res = spawnSync(process.execPath, [cli, script, '--check'], { cwd: root, encoding: 'utf8' })
    expect(res.status, res.stderr).toBe(0)
    expect(res.stdout).toContain('Validated 20 gallery packs')
  }, 15000)
})
