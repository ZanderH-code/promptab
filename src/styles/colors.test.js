import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve('src')

describe('component color tokens', () => {
  it('keeps literal colors in tokens.css only', () => {
    const violations = readdirSync(root, { recursive: true })
      .filter(path => path.endsWith('.css') && !path.endsWith('tokens.css'))
      .flatMap(path => [...readFileSync(resolve(root, path), 'utf8').matchAll(/#[\da-f]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|oklch)\s*\(/gi)].map(match => `${path}: ${match[0]}`))
    expect(violations).toEqual([])
  })
})
