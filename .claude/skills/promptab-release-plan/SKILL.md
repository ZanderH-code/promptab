---
name: promptab-release-plan
description: Use when you are the Promptab planning session and a batch is accepted or the user asks to release/publish Promptab. Runs the fixed accept, version-bump, merge and Edge-store publish flow.
---

# Promptab release flow (planning session)

Repo: /home/ubuntu/codeproject/promptab (GitHub ZanderH-code/promptab). Always `git fetch` and work from origin/main; the local checkout may be stale or detached.

## Standing authorization
The user has authorised this permanently: after YOU independently accept a batch, bump the version, merge, verify CI/Pages and trigger `publish-edge.yml` and `publish-chrome.yml`. Do not ask again. Stop only for real blockers: CI failing after a rerun, a submission already in review, missing secrets. Never use `codex review` / `codex exec` (user has no Codex quota; each call sends a quota email).

## Steps
1. **Accept**: read the diff yourself, run `npm run check:ci` (runs `npm run check`, packages & verifies Chromium + Firefox archives, and runs `npm run test:release` + `package-extension.check.mjs`), plus `npm run verify:ui` for UI changes and the e2e/browser tests relevant to the change. Real-site claims need a real Chromium run, not mocks.
2. **Check the store state first**: Edge and Chrome each allow ONE active submission in review. Look at the last `gh run list --workflow publish-edge.yml` / `publish-chrome.yml` and the public listing versions:
   - Edge: `curl -sL https://microsoftedge.microsoft.com/addons/getproductdetailsbycrxid/dicpfpbpnjfmgkbangallmhjpdhacjmc | grep -oE '"version":"[^"]+"'`
   - Chrome: `curl -sL "https://clients2.google.com/service/update2/crx?x=id%3Daeiigkihjpgggiohlfcglacilnllmboi%26v%3D0.0.0.0%26uc&prodversion=130.0&acceptformat=crx2,crx3"`
   If an earlier version is still in review (`InProgressSubmission` on Edge, `PENDING_REVIEW` on Chrome), do not resend alone: fold pending changes into the next version number and publish once the earlier one clears.
3. **Bump version** as a separate `chore: release <ver>` commit on the batch branch, in the same PR (feature branch, never push to main): `package.json`, `package-lock.json`, `public/manifest.json`, `EDGE_ADDONS_VERSION` in `.github/workflows/publish-edge.yml`, `CHROME_WEB_STORE_VERSION` in `.github/workflows/publish-chrome.yml`, `CHANGELOG.md`, `PLAN.md`, `store/release-<ver>.md`, and `store/listing.md` / `store/privacy-policy.md` / `docs/privacy/index.html` when behaviour or data use changed. `npm run test:release` must pass (it checks all versions and the built archives agree).
4. **Startup size budget**: startup JS must stay under 480,000 bytes (it was ~479.8 KB, almost no headroom). Measure with `npx playwright test e2e/startup-performance.spec.ts -g "480 KB"`; Windows CI counts about 22 bytes more than Linux. Never raise the budget; free space before adding code.
5. **CI**: wait for all PR checks (verify, playwright incl. Windows, gallery). Known server-only flake: the paint-timing test fails on this host on main too; do not treat that alone as a regression, but report it. Rerun a flaky job instead of asking the user.
6. **Merge** with `gh pr merge <n> --squash --match-head-commit <sha>`, then confirm main CI and the Pages deploy are green.
7. **Publish**:
   - Edge: trigger `publish-edge.yml` with workflow_dispatch, default `product_id` (do not hand-type it; the GUID is the Partner Center ID, not the public URL id), short `publish_notes`. Verify `Upload and submit to Edge Add-ons` succeeded and the log shows `Package upload: Succeeded` and `Store submission: Succeeded`.
   - Chrome: trigger `publish-chrome.yml` with workflow_dispatch, default `item_id` (`aeiigkihjpgggiohlfcglacilnllmboi`) and `publish_type=DEFAULT_PUBLISH` (uses Chrome Web Store API v2). Verify `Upload and submit to Chrome Web Store` succeeded and the log shows `Package upload: SUCCEEDED` and `Store submission: PENDING_REVIEW` (or `PUBLISHED`).
8. **Report**: version, PR link, merge SHA, Edge & Chrome publish run links. State plainly: submission accepted is NOT store approval (store review can take several days). Check the public pages later:
   - Edge: https://microsoftedge.microsoft.com/addons/detail/promptab/dicpfpbpnjfmgkbangallmhjpdhacjmc
   - Chrome: https://chromewebstore.google.com/detail/promptab/aeiigkihjpgggiohlfcglacilnllmboi

## Cannot be automated
Store description text, screenshots and release notes live in Partner Center and Chrome Developer Dashboard and must be pasted by the user from `store/listing.md` / `store/release-<ver>.md`. Say this in every report.

## Never fall behind main
Before every step that touches git (branching, bumping, merging, publishing) run `git fetch origin` and confirm your branch contains the current `origin/main` tip (`git merge-base --is-ancestor origin/main HEAD`). If main moved, rebase or merge main into the branch, rerun the checks, and only then merge. Publish only from the exact main SHA whose CI and Pages are green. Never merge a PR whose base is stale.

## Rules
Never print secrets. Report only final results to the user, not progress. Do not resume the same session concurrently. Use they/them for people with unknown pronouns.
