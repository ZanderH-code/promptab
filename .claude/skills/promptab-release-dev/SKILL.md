---
name: promptab-release-dev
description: Use when you are a Promptab developer session implementing a ticket. Defines branch, checks, size budget and handoff expected before the planner accepts and releases.
---

# Promptab development handoff (developer session)

Repo: /home/ubuntu/codeproject/promptab. Start with `git fetch`, branch from origin/main (`feat/...` or `fix/...`). Never push to main and never publish to the store. Dev sessions normally do not push at all and cannot run `gh pr`/`gh workflow`/`gh run`/`gh api`/`gh secret`: commit locally on your branch and let the planning session push and open the PR. Commits must end with a `Co-Authored-By` trailer. The planning session accepts, bumps the version and publishes.

## Before you hand off
- `npx tsc -b`, `npm run build`, `npm test -- --run`, `npm run docs:check`; run the e2e specs for the area you touched (`npm run test:e2e`, `npm run test:firefox` if browser-API code changed).
- Verify behaviour in a real Chromium with the built extension loaded for anything user-visible (icons, new tab, settings). Mocks are not evidence of real-site behaviour; say which you used.
- Add tests for the bug or feature, generic ones, no per-site hardcoding unless it is an explicit brand table entry.
- **Startup JS budget 480,000 bytes**: measure with `npx playwright test e2e/startup-performance.spec.ts -g "480 KB"`. Windows CI counts about 22 bytes more than Linux; never raise the budget. If you add code, remove code first and report the final byte count.
- Do not touch version numbers, CHANGELOG release entries or `EDGE_ADDONS_VERSION`; the planner does that, unless the ticket explicitly asks you for the `chore: release <ver>` commit. Do update `store/listing.md` / privacy text if data use or permissions change, and never add a browser permission without telling the planner.
- Known server-only flake: paint-timing/startup-speed test fails on this host on main as well. Report numbers for branch vs main instead of ignoring it.

## Handoff report
Root cause (with evidence), what changed, files, test commands and exact results, anything not verified, startup byte count, and any permission/privacy impact. Say plainly what failed.

## Never fall behind main
`git fetch origin` before you start and again before handoff. Your branch must contain the current `origin/main` tip (`git merge-base --is-ancestor origin/main HEAD`); if main moved, rebase onto it, rerun the checks, and report the base SHA in your handoff. A branch that is behind main is not ready for acceptance.

## Rules
No `codex review` / `codex exec`. Never print secrets. Work in your own branch or worktree; do not edit files another session is editing.
