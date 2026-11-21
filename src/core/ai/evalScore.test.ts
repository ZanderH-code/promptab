import { describe, expect, it } from 'vitest'
import { defaultProfile } from '../../features/settings/sectionDefaults'
import { EXAMPLES } from './examples'
import { firstPrompt, fixPrompt, parseCases, remoteRefs, scoreRecord, scoreReply, summarize, type EvalCase, type EvalRecord, type EvalSpan } from './evalScore'

const item: EvalCase = { id: 'colors-test', category: 'colors', language: 'en', scheme: 'dark', start: 'default', request: 'calm dark theme', expect: { mode: 'dark', parts: ['theme'], noRemote: true } }
const fenced = (value: unknown) => '```json\n' + JSON.stringify(value, null, 2) + '\n```'
const start = async () => ({ profile: await defaultProfile('en') })
const span = (step: 'generate' | 'fix', extra: Partial<EvalSpan> = {}): EvalSpan => ({
  'gen_ai.operation.name': 'chat', 'gen_ai.request.model': 'm', 'eval.case_id': item.id, 'eval.step': step, 'eval.prompt_hash': 'h',
  start_time: '2026-01-01T00:00:00Z', duration_ms: 1000, 'gen_ai.usage.input_tokens': 10, 'gen_ai.usage.output_tokens': 5, ...extra,
})

describe('eval scoring', () => {
  it('passes a valid pack and checks expectations', async () => {
    const pack = { ...EXAMPLES[0].pack as object, theme: { ...(EXAMPLES[0].pack as { theme: object }).theme, mode: 'dark' } }
    const score = scoreReply(item, await start(), `Here you go:\n${fenced(pack)}`)
    expect(score).toMatchObject({ extracted: true, valid: true, remoteAttempted: false, remoteApplied: false })
    expect(score.expect).toEqual({ checked: 3, failed: [] })
  })

  it('counts a reply without code as not extracted and fails every expectation', async () => {
    const score = scoreReply(item, await start(), 'Sorry, I cannot help with that.')
    expect(score).toMatchObject({ extracted: false, valid: false })
    expect(score.expect.failed).toEqual(['mode=dark', 'part:theme'])
  })

  it('flags a remote stylesheet as attempted and blocked, never applied', async () => {
    const score = scoreReply(item, await start(), fenced({ meta: { name: 'x' }, css: "@import url('https://example.com/x.css');\n.mnt-page { color: red; }" }))
    expect(score).toMatchObject({ valid: false, remoteAttempted: true, remoteApplied: false })
    expect(score.problems.css).toBeGreaterThan(0)
  })

  it('builds the fix prompt only when the reply needs one', async () => {
    const s = await start()
    expect(fixPrompt(item, s, fenced(EXAMPLES[0].pack))).toBeNull()
    expect(fixPrompt(item, s, 'no code')).toBeNull()
    const prompt = fixPrompt(item, s, fenced({ meta: { name: 'x' }, theme: { radius: 'round' } }))
    expect(prompt).toContain('theme.radius')
    expect(prompt).toContain(firstPrompt(item, s).split('\n')[0])
  })

  it('scores the last answered attempt and summarizes spans', async () => {
    const record: EvalRecord = {
      caseId: item.id, model: 'm', attempts: [
        { step: 'generate', reply: fenced({ meta: { name: 'x' }, theme: { radius: 'round' } }), span: span('generate') },
        { step: 'fix', reply: fenced(EXAMPLES[0].pack), span: span('fix', { duration_ms: 3000 }) },
      ],
    }
    const score = scoreRecord(item, await start(), record)
    expect(score).toMatchObject({ fixRounds: 1, errors: 0, first: { valid: false }, final: { valid: true } })
    const [summary] = summarize([record], [score])
    expect(summary).toMatchObject({ cases: 1, firstPassValid: 0, validAfterFix: 100, latencyP50Ms: 1000, latencyP95Ms: 3000, inputTokens: 20, outputTokens: 10, remoteApplied: 0 })
  })

  it('rejects duplicate ids and refine cases without a gallery start', () => {
    const line = JSON.stringify(item)
    expect(() => parseCases(`${line}\n${line}`)).toThrow(/duplicate/)
    expect(() => parseCases(JSON.stringify({ ...item, refine: true }))).toThrow(/gallery/)
  })

  it('reads remote references from the parsed CSS, not from text that looks like one', () => {
    const svg = `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'><circle r='1'/></svg>")`
    expect(remoteRefs(`.mnt-page { background-image: ${svg}; }`)).toEqual([])
    expect(remoteRefs(`/* see https://example.com and @import */ .a::after { content: "https://example.com"; }`)).toEqual([])
    expect(remoteRefs(`.a { background: url(mnt-asset:${'a'.repeat(64)}) }`)).toEqual([])
    expect(remoteRefs(`@import url('https://cdn.example.com/x.css');`)).toContain('@import')
    expect(remoteRefs(`.a { background: url("//evil.example/x.png") }`)).toEqual(['//evil.example/x.png'])
    expect(remoteRefs(`.a { background: url(pixel.gif) }`)).toEqual(['pixel.gif'])
    expect(remoteRefs(`.a { background: image-set("//evil.example/x.png" 1x) }`)).toEqual(['//evil.example/x.png'])
    expect(remoteRefs(`.a { background: u\\72l(https://evil.example/x.png) }`).length).toBeGreaterThan(0)
    expect(remoteRefs(`:root { --bg: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'/>"); --sep: "\\2022"; }`)).toEqual([])
    expect(remoteRefs(`.a { background: image-set(url("data:image/png;base64,AA==") type("image/png")) }`)).toEqual([])
    expect(remoteRefs(`.a { background: u\\72l("https://evil.example/x.png") }`).length).toBeGreaterThan(0)
    expect(remoteRefs(`.a { background: image-se\\74("https://evil.example/x.png" 1x) }`).length).toBeGreaterThan(0)
    expect(remoteRefs(`:root { --bg: image-set("https://evil.example/x.png" 1x) }`)).toEqual(['https://evil.example/x.png'])
    expect(remoteRefs(`@\\69mport "https://evil.example/x.css";`).length).toBeGreaterThan(0)
  })

  it('does not flag an SVG data URI in a pack as remote', async () => {
    const css = `.mnt-page { background-image: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'></svg>"); }`
    const score = scoreReply(item, await start(), fenced({ meta: { name: 'x' }, css }))
    expect(score).toMatchObject({ remoteAttempted: false, remoteApplied: false })
  })

  it('counts expectations of cases that got no reply as failed', async () => {
    const record: EvalRecord = { caseId: item.id, model: 'm', attempts: [{ step: 'generate', reply: '', span: span('generate', { 'error.type': 'timeout' }) }] }
    const score = scoreRecord(item, await start(), record)
    expect(score).toMatchObject({ first: null, final: null, errors: 1, expected: 3, remoteLeak: false })
    expect(summarize([record], [score])[0]).toMatchObject({ expectPassed: 0, callErrors: 1 })
  })

  it('attaches the current page and keeps the request in fix prompts, like the AI panel', async () => {
    const s = await start()
    const prompt = fixPrompt(item, s, fenced({ meta: { name: 'x' }, theme: { radius: 'round' } }))!
    expect(prompt).toContain(item.request)
    expect(prompt).not.toContain('no specific request')
  })
})

