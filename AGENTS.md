# Promptab: guide for AI coding agents

Promptab is a local-first new tab extension (Chromium, Edge, Firefox) plus a static site and theme gallery. Privacy is a product promise: no telemetry, no analytics, no remote requests in the extension.

## Where things live

- Feature map (EN / zh-CN capability → entrypoints & tests): `docs/features.md`
- `src/core/` — pure logic (`ai/`, `schema/`, `css/`, `tokens/`, `layout/`, `migrate/`). Architecture boundaries are enforced by ESLint (`eslint.config.mjs`).
- `src/features/`, `src/app/` — React UI; `src/features/settings/AiWorkbench.tsx` is the AI panel.
- `docs/ai/` — generated AI docs (`npm run docs:ai`); `docs/gallery/packs/` — gallery theme packs (`npm run gallery`).
- `evals/` — real-model eval cases and baselines (`scripts/eval.ts`). `e2e/` — Playwright specs. `store/` — store listing and release notes. `PLAN.md` — roadmap and release log.

## Commands & checks

- `npm run dev` — local dev server.
- `npm run check` — full local gate matching CI `verify` (docs, gallery, ESLint, Vitest + property invariants, `eval:replay` release gate, `tsc` for app and tools, extension + web builds). Run before handing off.
- `npm run verify:ui` — headless Chromium check (`/` & `/#safe`, desktop + mobile screenshots in `.artifacts/ui-verify/`). Inspect screenshots after UI edits; `npm run hooks:install` enables the pre-push UI hook.
- Browser E2E & size budget: `npm run test:e2e`, `npm run test:firefox` (for browser-API edits), and `npx playwright test e2e/startup-performance.spec.ts -g "480 KB"`. Startup JS must stay under 480,000 bytes — never raise the budget, free space first.

## AI theme generation & evals

History and plan: `docs/eval-plan.md`. Measure, do not guess.

- **Changed prompt, pack/profile schema, widgets, layout, or CSS API?** Run a live eval before and after on at least the default comparison set:
  `npm run eval -- --models mistral/deepseek-v4-1-flash-1017,opencode-go/gpt-6-luna,claude/claude-sonnet-5-5`
  (`EVAL_BASE_URL` sets the OpenAI-compatible endpoint). Report first-pass valid, valid after fix, and expectations met before vs after. Release gate (enforced by `eval:replay`): ≥3 providers, first pass ≥80%, after fix ≥95%, 0 remote refs applied.
- **Added a widget, prop, option, or CSS capability?** Document it in `slimSchema()` (`src/core/ai/prompt.ts`) and add cases to `evals/cases.jsonl`.
- **Changed scoring or checks?** Run `npm run eval:replay` (or `-- --update` with explanation in the PR). New baseline after prompt tuning: rerun with `--baseline <name>` and update `docs/ai/eval.md`.

## Rules (not fully checkable in CI)

- Read `.claude/skills/promptab-release-dev/SKILL.md` (dev) or `.claude/skills/promptab-release-plan/SKILL.md` (release). Branch from `origin/main`; never touch version numbers or publish unless you are the release session.
- Never add a browser permission or change data use without updating `store/listing.md`, `store/privacy-policy.md`, and `docs/privacy/index.html` (parity checked by `manifestPermissions.test.ts`), and calling it out in the PR.
- Generated files (`docs/ai/*` except `docs/ai/eval.md`, `docs/gallery/index.json`) come from scripts; edit source and regenerate.
- Never print or commit secrets (`evals/runs/` is gitignored). Do not edit files another session or worktree is working on.
