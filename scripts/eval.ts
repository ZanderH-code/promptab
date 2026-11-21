/**
 * Real-model evaluation of AI theme generation. See docs/eval-plan.md.
 *
 *   npm run eval -- --models <id,id> [--cases <id,id>] [--category <name>] [--fix-rounds 1] [--concurrency 4] [--baseline <name>]
 *   npm run eval:replay [-- --update]
 *
 * Live runs call an OpenAI-compatible endpoint: EVAL_BASE_URL (default http://127.0.0.1:3425/v1), EVAL_API_KEY
 * (optional). Output goes to evals/runs/<run-id>/ (gitignored); --baseline also writes evals/baselines/<name>.json.
 * Replay rescores every committed baseline with the current code, without network, and fails when a score
 * changed or a remote reference would reach the page; --update rewrites the stored scores.
 */
import { createHash } from 'node:crypto'
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import {
  firstPrompt, fixPrompt, parseCases, resolveStart, scoreRecord, summarize, summaryTable,
  type EvalAttempt, type EvalCase, type EvalRecord, type EvalSpan, type EvalStart, type RecordScore,
} from '../src/core/ai/evalScore'
import { buildPromptPack, buildRefinePrompt } from '../src/core/ai/prompt'
import { defaultProfile } from '../src/features/settings/sectionDefaults'

const root = join(import.meta.dirname, '..')
const evalsDir = join(root, 'evals')
const baselinesDir = join(evalsDir, 'baselines')

type RunFile = { promptHash: string; createdAt: string; records: EvalRecord[]; scores: RecordScore[] }

const { values } = parseArgs({
  options: {
    models: { type: 'string' },
    cases: { type: 'string' },
    category: { type: 'string' },
    'fix-rounds': { type: 'string', default: '1' },
    concurrency: { type: 'string', default: '4' },
    baseline: { type: 'string' },
    replay: { type: 'boolean', default: false },
    update: { type: 'boolean', default: false },
  },
})

const allCases = parseCases(readFileSync(join(evalsDir, 'cases.jsonl'), 'utf8'))
const caseById = new Map(allCases.map(item => [item.id, item]))
const promptHash = createHash('sha256').update((['en', 'zh-CN'] as const)
  .map(language => buildPromptPack({ language }) + buildRefinePrompt({ language, pack: {}, change: '' })).join('')).digest('hex').slice(0, 12)
const readGallery = (name: string) => readFileSync(join(root, 'docs', 'gallery', 'packs', `${name}.json`), 'utf8')

const starts = new Map<string, EvalStart>()
/** Resolved once per case before any call, so a bad case fails before tokens are spent. */
async function startFor(item: EvalCase): Promise<EvalStart> {
  let start = starts.get(item.id)
  if (!start) starts.set(item.id, start = resolveStart(item, await defaultProfile(item.language), readGallery))
  return start
}

function positiveInt(name: string, value: string | undefined, min: number): number {
  const number = Number(value)
  if (!Number.isInteger(number) || number < min) throw new Error(`--${name} must be an integer of at least ${min}`)
  return number
}

async function call(model: string, prompt: string, item: EvalCase, step: EvalAttempt['step']): Promise<EvalAttempt> {
  const baseUrl = process.env.EVAL_BASE_URL ?? 'http://127.0.0.1:3425/v1'
  const started = Date.now()
  const span: EvalSpan = {
    'gen_ai.operation.name': 'chat', 'gen_ai.request.model': model,
    'eval.case_id': item.id, 'eval.step': step, 'eval.prompt_hash': promptHash,
    start_time: new Date(started).toISOString(), duration_ms: 0,
  }
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(process.env.EVAL_API_KEY ? { authorization: `Bearer ${process.env.EVAL_API_KEY}` } : {}) },
      body: JSON.stringify({ model, max_tokens: 16000, messages: [{ role: 'user', content: prompt }] }),
      signal: AbortSignal.timeout(300_000),
    })
    if (!response.ok) {
      await response.body?.cancel()
      span.duration_ms = Date.now() - started
      return { step, reply: '', span: { ...span, 'error.type': `http_${response.status}` } }
    }
    let body: { model?: string; usage?: { prompt_tokens?: number; completion_tokens?: number }; choices?: { message?: { content?: unknown } }[] }
    try { body = await response.json() } catch (error) {
      if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) throw error
      span.duration_ms = Date.now() - started
      return { step, reply: '', span: { ...span, 'error.type': 'bad_json' } }
    }
    span.duration_ms = Date.now() - started
    const content = body.choices?.[0]?.message?.content
    let reply = typeof content === 'string' ? content : ''
    // A misconfigured proxy must never get the key into a saved (possibly committed) reply.
    const key = process.env.EVAL_API_KEY
    if (key && reply.includes(key)) reply = reply.split(key).join('[redacted]')
    return {
      step, reply,
      span: {
        ...span,
        ...(body.model ? { 'gen_ai.response.model': body.model } : {}),
        ...(body.usage?.prompt_tokens !== undefined ? { 'gen_ai.usage.input_tokens': body.usage.prompt_tokens } : {}),
        ...(body.usage?.completion_tokens !== undefined ? { 'gen_ai.usage.output_tokens': body.usage.completion_tokens } : {}),
        ...(reply ? {} : { 'error.type': 'empty_reply' }),
      },
    }
  } catch (error) {
    span.duration_ms = Date.now() - started
    return { step, reply: '', span: { ...span, 'error.type': error instanceof Error && error.name === 'TimeoutError' ? 'timeout' : 'network' } }
  }
}

/** Generates, then asks for fixes the way the AI panel's "Ask the AI to fix it" does. */
async function runCase(model: string, item: EvalCase, fixRounds: number): Promise<EvalRecord> {
  const start = await startFor(item)
  const attempts = [await call(model, firstPrompt(item, start), item, 'generate')]
  for (let round = 0; round < fixRounds; round++) {
    const last = attempts.at(-1)!
    if (last.span['error.type']) break
    const prompt = fixPrompt(item, start, last.reply)
    if (!prompt) break
    attempts.push(await call(model, prompt, item, 'fix'))
  }
  return { caseId: item.id, model, attempts }
}

async function pool<T>(jobs: (() => Promise<T>)[], size: number): Promise<T[]> {
  const results: T[] = new Array(jobs.length)
  let next = 0
  await Promise.all(Array.from({ length: Math.min(size, jobs.length) }, async () => {
    while (next < jobs.length) {
      const index = next++
      results[index] = await jobs[index]()
    }
  }))
  return results
}

async function rescore(records: readonly EvalRecord[]): Promise<RecordScore[]> {
  return Promise.all(records.map(async record => {
    const item = caseById.get(record.caseId)
    if (!item) throw new Error(`baseline names an unknown case: ${record.caseId}`)
    return scoreRecord(item, await startFor(item), record)
  }))
}

async function live() {
  const models = values.models?.split(',').map(model => model.trim()).filter(Boolean) ?? []
  if (!models.length) throw new Error('--models is required, e.g. --models mistral/deepseek-v4-1-flash-1017')
  const ids = values.cases?.split(',').map(id => id.trim())
  const cases = allCases.filter(item => (!ids || ids.includes(item.id)) && (!values.category || item.category === values.category))
  if (!cases.length) throw new Error('no cases match')
  const fixRounds = positiveInt('fix-rounds', values['fix-rounds'], 0)
  const concurrency = positiveInt('concurrency', values.concurrency, 1)
  await Promise.all(cases.map(startFor))
  const runId = new Date().toISOString().replace(/[:.]/g, '-')
  const out = join(evalsDir, 'runs', runId)
  mkdirSync(out, { recursive: true })

  // Each record is appended as it finishes, so an interrupted run keeps the replies already paid for.
  const jobs = models.flatMap(model => cases.map(item => async () => {
    const record = await runCase(model, item, fixRounds)
    appendFileSync(join(out, 'records.jsonl'), JSON.stringify(record) + '\n')
    appendFileSync(join(out, 'traces.jsonl'), record.attempts.map(attempt => JSON.stringify(attempt.span) + '\n').join(''))
    const final = record.attempts.at(-1)!
    console.log(`${model}  ${item.id}  ${record.attempts.length} call(s)${final.span['error.type'] ? `  error=${final.span['error.type']}` : ''}`)
    return record
  }))
  const records = await pool(jobs, concurrency)
  const scores = await rescore(records)
  const run: RunFile = { promptHash, createdAt: new Date().toISOString(), records, scores }
  const table = summaryTable(summarize(records, scores))

  writeFileSync(join(out, 'run.json'), JSON.stringify(run, null, 2) + '\n')
  writeFileSync(join(out, 'summary.md'), `# Eval run ${runId}\n\nPrompt hash: \`${promptHash}\`. Fix rounds: ${fixRounds}.\n\n${table}\n`)
  if (values.baseline) {
    mkdirSync(baselinesDir, { recursive: true })
    writeFileSync(join(baselinesDir, `${values.baseline}.json`), JSON.stringify(run, null, 2) + '\n')
  }
  console.log(`\n${table}\n\nSaved to ${out}`)
}

async function replay() {
  const files = existsSync(baselinesDir) ? readdirSync(baselinesDir).filter(name => name.endsWith('.json')) : []
  if (!files.length) throw new Error('no baselines in evals/baselines')
  let failed = false
  for (const name of files) {
    const path = join(baselinesDir, name)
    const run = JSON.parse(readFileSync(path, 'utf8')) as RunFile
    const scores = await rescore(run.records)
    const stored = Array.isArray(run.scores) ? run.scores : []
    const changed = scores.filter((score, index) => JSON.stringify(score) !== JSON.stringify(stored[index]))
    if (stored.length !== scores.length) console.error(`${name}: ${stored.length} stored scores for ${scores.length} records`)
    const leaked = scores.filter(score => score.remoteLeak)
    for (const score of leaked) console.error(`${name}: remote reference would reach the page: ${score.model} ${score.caseId}`)
    if (leaked.length) failed = true
    if (values.update && !leaked.length) {
      writeFileSync(path, JSON.stringify({ ...run, scores }, null, 2) + '\n')
      console.log(`${name}: ${changed.length} score(s) updated`)
    } else if (changed.length || stored.length !== scores.length) {
      failed = true
      for (const score of changed) console.error(`${name}: score changed for ${score.model} ${score.caseId}; run npm run eval:replay -- --update if intended`)
    } else console.log(`${name}: ${scores.length} records unchanged${run.promptHash === promptHash ? '' : ' (recorded with an older prompt)'}`)
    console.log(summaryTable(summarize(run.records, scores)))
  }
  if (failed) process.exitCode = 1
}

await (values.replay ? replay() : live())
