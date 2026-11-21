# Promptab real-model evals and tracing: plan (draft)

Status: phase 1 done (runner, 50 cases, replay in CI, first baseline: DeepSeek V4.1 Flash, 84% first-pass valid, 98% after one fix round). Replaces the simulated eval in `docs/ai/eval.md` with a real one.

## Goal

Measure how well real models turn a style request into a usable Promptab theme pack, compare models and prompt versions with numbers, and catch prompt regressions in CI.

Out of scope: any telemetry inside the extension. Promptab stays zero-tracking; all tracing lives in the eval harness on the developer machine.

## Pipeline under test (already exists, reused as-is)

`buildPromptPack` → model → `extractCandidates` → `readCandidate` → `autoFix` → `analyzeCandidate` (problems, contrast and CSS-pitfall warnings) → `applyPack`.
Refine round: `buildErrorFeedback` → `buildRefinePrompt` → model → same checks.

## Layout

```
evals/
  cases.jsonl          # dataset, one case per line
  rubric.md            # judge rubric
  runs/<run-id>/       # gitignored: raw replies, traces, screenshots
  baselines/<name>.json# committed: replies + scores used by replay mode
scripts/eval.ts        # vite-node runner
```

npm scripts: `eval` (live), `eval:replay` (no network, CI), `eval:report`.

## Dataset (≈50 cases)

| Category | Count | Example |
| --- | --- | --- |
| Colours only | 8 | "warm paper, low contrast at night" |
| Layout | 8 | "three columns of sites on the left, clock on top" |
| CSS-heavy | 8 | "glassmorphism cards with subtle grain" |
| Widgets | 6 | "add weather and a todo list" |
| Refine existing page | 6 | start from a gallery pack, "make it lighter" |
| Ambiguous or contradictory | 6 | "dark but bright", "minimal with lots of widgets" |
| Chinese requests | 5 | "像宣纸一样的浅色主题" |
| Adversarial | 3 | request asks for `@import` of a remote URL or a tracking pixel; must be blocked by sanitize |

Each case: `id, category, language, scheme, request, start?` and optional hard assertions (for example `scheme: light`, `parts includes layout`, `no remote url`).

## Metrics per case and per model

Deterministic (free, every run):
- parse rate: a candidate was extracted
- first-pass valid: schema passes with no problems
- valid after `autoFix`
- valid after one refine round
- warning counts: contrast, CSS pitfalls, CSS over `MAX_CSS_LINES`
- hard assertions passed
- security: no remote resources survive sanitize (must be 100%)

Quality (costs tokens):
- render: apply the pack in the built extension page with Playwright, screenshot, run axe contrast
- judge: a vision model scores screenshot vs request on the rubric (1–5: matches request, readable, coherent). Judge from a different family than the generator. Calibrate on 20 cases hand-labelled by Zander; report agreement.

Cost and speed (from traces): input/output tokens, cost, latency p50/p95, retries, refine rounds needed.

## Tracing

The runner wraps every model call and writes one JSONL span per call to `runs/<id>/traces.jsonl` using OpenTelemetry GenAI attribute names (`gen_ai.request.model`, `gen_ai.usage.input_tokens`, `gen_ai.usage.output_tokens`, duration, error type), plus case id, prompt version hash and step (`generate` / `refine` / `judge`). Optional later: export to a local OTLP collector or Langfuse. Possible tie-in with spanless for reading these traces.

## Models

Live runs go through the local Magpie gateway (OpenAI-compatible), so one code path reaches every model. The extension's own `sendByok` is not used by the runner.

Proposed set: Claude Sonnet 5.5, GPT-6 Luna, DeepSeek V4.1 Flash, plus Claude Opus 5.5 (the BYOK default) for a smaller subset. Judge: a model not in the generator set for that comparison.

## CI

`eval:replay` runs the deterministic checks on the committed baseline replies on every PR: it catches schema, parser, autoFix and sanitize regressions with no keys and no cost. Live runs are manual (or a scheduled job later) and update the baseline when the prompt changes.

## Phases

1. Dataset, runner, deterministic metrics, replay mode, CI job.
2. Live multi-model runs, tracing, cost table.
3. Render, axe, LLM judge, human calibration.
4. Use it: iterate the prompt against the numbers, rewrite `docs/ai/eval.md` with real results, add one line with real numbers to the README and the GitHub profile.

## Open decisions

- Model set and budget per live run.
- Whether raw model replies are committed (baseline) or only summaries.
- Judge model.
