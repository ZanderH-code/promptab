import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CSS_API_ATTRIBUTES, CSS_API_CLASSES } from '../css/api'
import { ATTRIBUTE_NOTES, buildDocs, CLASS_NOTES } from './docs'
import { buildPromptPack } from './prompt'
import { aiPackSchema } from './pack'

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

  it('documents the M3 layout, widget and bookmark surfaces in both the guide and prompt', () => {
    const guide = docs['css-api.md']
    for (const selector of ['.mnt-layout', '.mnt-widget-frame', '.mnt-widget-toolbar', '.mnt-bookmark-tile', '.mnt-bookmark-list', '.mnt-bookmark-icon-only', '[data-layout-template="banner"]', '[data-breakpoint="narrow"]', '[data-edit-mode]', '[data-widget-id="clock"]', '[data-widget="toolbar"]', '[data-area="banner"]']) {
      expect(guide).toContain(selector)
    }
  })

  it('reproduces the ten simulated evaluation cases', () => {
    const requests = ['Quiet monochrome', 'Warm paper', 'Ocean dusk', 'Forest morning', 'Neon terminal', 'Soft pastel', 'Editorial serif', 'Compact dashboard', 'Minimal clock', 'High contrast']
    const first = requests.map((request, index) => {
      const prompt = buildPromptPack({ language: 'en', request })
      const candidate = { kind: 'mnt.theme-pack', cssApiVersion: index < 4 ? 999 : 1, theme: { mode: 'dark' } }
      const initial = prompt.includes(request) && aiPackSchema.safeParse(candidate).success
      const feedback = aiPackSchema.safeParse(candidate)
      const corrected = !feedback.success && feedback.error.issues.some(issue => issue.path.join('.') === 'cssApiVersion') ? { ...candidate, cssApiVersion: 1 } : candidate
      return { initial, afterFeedback: aiPackSchema.safeParse(corrected).success }
    })
    expect(first.filter(result => result.initial)).toHaveLength(6)
    expect(first.filter(result => result.afterFeedback)).toHaveLength(10)
  })

  it('links every generated file from llms.txt', () => {
    for (const path of Object.keys(docs).filter(path => path !== 'llms.txt')) expect(docs['llms.txt']).toContain(`(${path})`)
  })
})
