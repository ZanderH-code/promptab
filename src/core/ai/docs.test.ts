import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CSS_API_ATTRIBUTES, CSS_API_CLASSES } from '../css/api'
import { ATTRIBUTE_NOTES, buildDocs, CLASS_NOTES } from './docs'

const root = (path: string) => join(process.cwd(), 'docs', 'ai', path)

describe('docs/ai', () => {
  const docs = buildDocs()

  it.each(Object.keys(docs))('%s is up to date (run `npm run docs:ai` after changing the schema, API or examples)', path => {
    expect(readFileSync(root(path), 'utf8').replace(/\r\n/g, '\n')).toBe(docs[path])
  })

  it('documents every class and attribute of the CSS API', () => {
    expect(Object.keys(CLASS_NOTES).sort()).toEqual([...CSS_API_CLASSES].sort())
    expect(Object.keys(ATTRIBUTE_NOTES).sort()).toEqual([...CSS_API_ATTRIBUTES].sort())
    for (const name of CSS_API_CLASSES) expect(docs['css-api.md']).toContain(`.${name}`)
  })

  it('links every generated file from llms.txt', () => {
    for (const path of Object.keys(docs).filter(path => path !== 'llms.txt')) expect(docs['llms.txt']).toContain(`(${path})`)
  })
})
