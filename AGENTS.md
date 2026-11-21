# Promptab: guide for AI coding agents

Promptab is a local-first new tab extension (Chromium, Edge, Firefox) plus a static website and theme gallery. People describe a theme to their own AI; Promptab builds the prompt, checks the reply and applies the theme pack. Privacy is a product promise: no tracking, no telemetry, no developer servers.

## Repo map

- `src/core/` — pure logic: `ai/` (prompt, parse, checks, BYOK, evals scoring), `schema/` (profile and pack schemas, ranges), `css/` (sanitizer, CSS API), `tokens/`, `layout/`, `migrate/`.
- `src/features/`, `src/app/` — React UI; `src/features/settings/AiWorkbench.tsx` is the AI panel.
- `docs/ai/` — generated AI docs (`npm run docs:ai`); `docs/gallery/packs/` — gallery theme packs.
- `evals/` — real-model eval cases, rubric and committed baselines; `scripts/eval.ts` runs them.
- `e2e/` — Playwright specs. `store/` — store listing and release notes. `PLAN.md` — product plan and release log.

## Checks before handing off

Run what CI runs (`.github/workflows/ci.yml`):

```
npm run docs:check && npx vitest run && npm run eval:replay && npx tsc -b && npm run build
```

Plus the Playwright specs for the area you touched (`npm run test:e2e`, `npm run test:firefox` for browser-API code). Startup JS must stay under 480,000 bytes: `npx playwright test e2e/startup-performance.spec.ts -g "480 KB"`; never raise the budget, free space first.

Release and handoff rules live in `.claude/skills/promptab-release-dev/SKILL.md` (developer sessions) and `.claude/skills/promptab-release-plan/SKILL.md` (release). Read the one that matches your role. In short: branch from `origin/main`, never push to main, never touch version numbers or publish unless you are the release session.

## AI theme generation and evals

The prompt (`src/core/ai/prompt.ts`), the pack schema (`src/core/ai/pack.ts`, `src/core/schema/profile.ts`) and the checks (`analyze.ts`, `fix.ts`, `css/sanitize.ts`) decide whether real models produce usable themes. Measure, do not guess. Plan and history: `docs/eval-plan.md`.

- **Changed the prompt, the pack/profile schema, widgets, layout or the CSS API?** Run a live eval before and after, on at least the default comparison set:
  `npm run eval -- --models mistral/deepseek-v4-1-flash-1017,opencode-go/gpt-6-luna,claude/claude-sonnet-5-5`
  (OpenAI-compatible endpoint from `EVAL_BASE_URL`, default the local gateway). Report first-pass valid, valid after fix and expectations met per model, before and after. Release gate from `PLAN.md`: at least 3 providers, first pass ≥ 80%, after one fix round ≥ 95%.
- **Added a widget, prop, option or CSS capability?** Document it in `slimSchema()` in `prompt.ts` (the test "documents every widget type, prop and option" fails otherwise) and add cases to `evals/cases.jsonl`.
- **Changed parsing or checks?** `npm run eval:replay` rescores the committed baselines offline. If scores change on purpose, run `npm run eval:replay -- --update` and explain the change in the PR. A remote reference reaching the page is always a failure.
- **New baseline after a prompt change:** rerun with `--baseline <name>`, replace the old file in `evals/baselines/`, and update the numbers in `docs/ai/eval.md`.
- Live runs cost tokens; `evals/runs/` is gitignored. Never commit API keys; the runner redacts the key from replies and does not save the endpoint.

## Rules

- No telemetry, analytics or remote requests in the extension. Tracing exists only in `scripts/eval.ts`.
- Never add a browser permission or change data use without updating `store/listing.md` and the privacy texts, and saying so in the PR.
- Generated files (`docs/ai/*` except the hand-written `docs/ai/eval.md`, gallery index) come from scripts; edit the source and regenerate.
- Never print or commit secrets. Do not edit files another session or worktree is working on.
