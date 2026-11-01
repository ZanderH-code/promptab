import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CSS_API_CLASSES, CSS_API_VARIABLES, CSS_API_VERSION } from './api'

const src = join(process.cwd(), 'src')
function files(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? files(path) : /\.(tsx?|css)$/.test(name) && !/\.test\./.test(name) && !path.endsWith('api.ts') && !path.endsWith('docs.ts') && !path.endsWith('prompt.ts') ? [path] : []
  })
}
const source = files(src).map(path => readFileSync(path, 'utf8')).join('\n')

describe('CSS API', () => {
  it('is version 1', () => expect(CSS_API_VERSION).toBe(1))

  it.each(CSS_API_CLASSES)('class %s is rendered by the app', name => {
    if (name.startsWith('mnt-bookmark-')) {
      expect(source).toContain('mnt-bookmark-${style}')
      expect(source).toContain(`'${name.slice('mnt-bookmark-'.length)}'`)
      return
    }
    expect(new RegExp(`['"\` ]${name}(?=['"\` $])`).test(source)).toBe(true)
  })

  it.each(CSS_API_VARIABLES)('variable %s is defined by the app', name => {
    expect(source).toContain(name)
  })
})
