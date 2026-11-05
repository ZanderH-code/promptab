# Favicon matrix comparison

- Run date: 2026-11-05
- Baseline commit: `3a86c10` (`main`)
- Branch: `feat/favicon-quality`
- Matrix: 68 sites; display size 72px; DPR 1
- The baseline results were recalculated from the saved candidate-level observations using the same hit and clarity rules as the branch report. The external network observations are time-sensitive.
- The branch matrix was rerun after the first-paint changes. Neither run uses hover. This script probes candidate images directly and does not sample the icon actually displayed by the component; the numbers below must not be interpreted as UI verification.

| Platform | Main hits | Branch hits | Change | Main clear | Branch clear | Change |
|---|---:|---:|---:|---:|---:|---:|
| Chromium extension | 51/68 (75%) | 56/68 (82%) | +5 sites | 2/68 (3%) | 16/68 (24%) | +14 sites |
| Web | 52/68 (76%) | 54/68 (79%) | +2 sites | 2/68 (3%) | 14/68 (21%) | +12 sites |
| Firefox | unavailable | unavailable | — | unavailable | unavailable | — |

Firefox could not launch in this Linux environment because GTK/Cairo libraries are missing. The Firefox build itself succeeded. See [main report](favicon-matrix-2026-11-05-main.md) and [branch report](favicon-matrix-2026-11-05-branch.md) for per-site winners and every candidate's HTTP metadata, browser image result, dimensions, latency, and failure reason.

For `claude.ai/new`, the clean-profile Chromium `/_favicon` response matches the browser's default globe image, so it is rejected. The branch then loads `https://claude.ai/apple-touch-icon.png` at 180×180. The baseline only tried `/favicon.ico`; although its HTTP response is 200, `Cross-Origin-Resource-Policy: same-origin` blocks it in the extension page, leaving the text fallback. This matches the observed letter icon.

The main and branch runs used different candidate sets, as expected: main used Chromium `/_favicon` at 64px and `/favicon.ico`; the branch added 128px `_favicon` plus same-origin touch icon, SVG, 32px PNG, and ICO candidates. Browser image loading is recorded separately from unauthenticated HTTP header probes. Cross-origin pixels without CORS cannot be read for transparency checks, so only loadable dimensions, one-by-one images, readable transparency, and the measured Chromium globe fingerprint are classified.
