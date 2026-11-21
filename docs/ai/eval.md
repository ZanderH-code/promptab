# AI theme generation: real-model evaluation

Promptab sends a prompt to the person's own AI and checks the reply before applying it. This page records how often real models produce a pack that passes every check, measured with `npm run eval` (runner: `scripts/eval.ts`, scoring: `src/core/ai/evalScore.ts`, plan: `docs/eval-plan.md`).

## Method

- 50 cases in `evals/cases.jsonl`: colors 8, layout 8, CSS 8, widgets 6, refine 6, ambiguous 6, Chinese 5, adversarial 3. Each starts from the default page or a gallery pack and sends the same prompt the AI panel builds (current page attached).
- A reply is **valid** when a pack is found and passes the same checks the AI panel runs (auto-fix, schema, CSS sanitizer). Contrast and CSS advice are counted but do not block.
- When a reply is not valid, the runner sends one **fix round**: the app's own "ask the AI to fix it" message.
- **Expectations** are per-case facts the result must have, such as dark mode or a todo widget.
- **Remote** counts packs that try to load anything from another origin. "Applied" means it would reach the page; it must be 0.
- Every call is traced with OpenTelemetry GenAI attributes (`evals/runs/<id>/traces.jsonl`). The committed baseline `evals/baselines/three-providers.json` is rescored offline in CI with `npm run eval:replay`.

Release gate (`PLAN.md`): at least 3 providers, first pass ≥ 80%, after one fix round ≥ 95%.

## Results (2026-11-21, baseline `three-providers`)

| Model | First-pass valid | Valid after fix | Expectations met | Remote tried / applied | p50 / p95 latency |
| --- | --- | --- | --- | --- | --- |
| DeepSeek V4.1 Flash | 96% | 100% | 100% | 0 / 0 | 2.7s / 4.9s |
| GPT-6 Luna | 94% | 100% | 100% | 0 / 0 | 7.4s / 16.0s |
| Claude Sonnet 5.5 | 98% | 100% | 100% | 0 / 0 | 12.8s / 19.4s |

All three providers pass the gate. The full table, with token counts, is printed by `npm run eval:replay`.

With 50 cases, one case is 2 points; first-pass numbers moved by up to 4 points between two runs of the same prompt. Compare runs by the failing cases, not by a 2-point difference.

## How the prompt got here

| Prompt | DeepSeek first / after fix | GPT-6 Luna first / after fix | Sonnet 5.5 first / after fix |
| --- | --- | --- | --- |
| Before the evals | 84% / 98% | not run | not run |
| Every widget prop, option and area style documented | 96% / 100% | 78% / 98% | 100% / 100% |
| `props` marked required, areas must appear in every breakpoint | 96% / 98% | 98% / 100% | 100% / 100% |
| Area alignment listed in the layout guide, fix hint for repeated grid rows (current baseline) | 96% / 100% | 94% / 100% | 98% / 100% |

- First round: models guessed widget props (`size: "sm"`, todos without ids, dates with times, `unit: "f"`, unknown alignments). Documenting every widget type, prop and option in the prompt fixed most of it; a test now fails when a widget, prop or option is missing from the prompt.
- Second round: Luna left out `props` on widgets that had none. Marking it required took Luna from 78% to 98%.
- Third round: the layout guide said area styles supported everything except alignment, contradicting the field reference; and the error for a repeated grid row now says how to fix it ("rows must differ"), after DeepSeek repeated the same row in its fix. Every case is now valid after one fix round.

Remaining first-pass failures are one-off field mistakes (a malformed color, a size below 0.5, a widget outside the narrow grid), all fixed by the fix round. In earlier runs, DeepSeek and Luna occasionally skipped the widgets part of a widget-heavy request; watch that expectation in future runs.

## Reproduce

```
npm run eval -- --models mistral/deepseek-v4-1-flash-1017,opencode-go/gpt-6-luna,claude/claude-sonnet-5-5
npm run eval:replay
```

Live runs need an OpenAI-compatible endpoint (`EVAL_BASE_URL`, `EVAL_API_KEY`) and cost tokens: this run used about 1.36M input and 0.17M output tokens across the three models.
