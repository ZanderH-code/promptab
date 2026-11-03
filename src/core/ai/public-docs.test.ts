import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { aiPackSchema } from './pack'
import { sanitizeCss } from '../css/sanitize'

const examples = resolve(process.cwd(), 'docs/docs/examples')
const files = readdirSync(examples).sort()

describe('public documentation examples', () => {
  it('validates every theme pack and sanitizes every CSS example', () => {
    expect(files.length).toBeGreaterThan(0)
    for (const file of files) {
      const source = readFileSync(resolve(examples, file), 'utf8')
      if (file.endsWith('.json')) {
        const pack = JSON.parse(source)
        expect(aiPackSchema.safeParse(pack), file).toMatchObject({ success: true })
        if (typeof pack.css === 'string') expect(sanitizeCss(pack.css), `${file}: css`).toMatchObject({ ok: true })
      } else if (file.endsWith('.css')) {
        expect(sanitizeCss(source), file).toMatchObject({ ok: true })
      }
    }
  })
})
