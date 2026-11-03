import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return entry.isFile() && path.endsWith('.tsx') ? [path] : []
  })
}

describe('localized UI copy', () => {
  it('does not use language conditionals to choose hardcoded strings', () => {
    const root = resolve(process.cwd(), 'src')
    const pattern = /\b(?:[\w$]+\.)*language\s*===\s*(['"])(?:en|zh-CN)\1\s*\?\s*(['"`])([^'"`]+)\2\s*:\s*(['"`])([^'"`]+)\4/g
    const findings = sourceFiles(root).flatMap(file => {
      const source = readFileSync(file, 'utf8')
      return [...source.matchAll(pattern)]
        .filter(([, , , left, , right]) => !['en', 'zh', 'zh-CN'].includes(left) || !['en', 'zh', 'zh-CN'].includes(right))
        .map(match => `${file}: ${match[0]}`)
    })
    expect(findings).toEqual([])
  })
})
