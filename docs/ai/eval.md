# Simulated AI prompt and schema evaluation

This is a deterministic local simulation, not a real-provider evaluation. No model is called and no response is generated. The ten style requests below are checked for inclusion in the English prompt. Each is paired with a hand-authored minimal candidate containing `kind`, `cssApiVersion` and a dark theme mode; these candidates do not attempt to implement the requested styles. The first four deliberately use an unsupported CSS API version, while the other six use version 1. The schema validates each candidate; for failures, the simulation inspects the issue path and replaces the unsupported version with 1 before validating again. There is no automated or model-generated feedback response.

| Simulated request | First schema check | After scripted correction |
| --- | --- | --- |
| Quiet monochrome | Fail | Pass |
| Warm paper | Fail | Pass |
| Ocean dusk | Fail | Pass |
| Forest morning | Fail | Pass |
| Neon terminal | Pass | Pass |
| Soft pastel | Pass | Pass |
| Editorial serif | Pass | Pass |
| Compact dashboard | Pass | Pass |
| Minimal clock | Pass | Pass |
| High contrast | Pass | Pass |

The simulated first-pass result is 6/10 (60%); after the scripted correction it is 10/10 (100%). These figures reflect the deliberately constructed fixtures and schema checks only. They do not measure real AI accuracy, design quality, provider behavior, or the effectiveness of actual feedback.

Reproduce with `npx vitest run src/core/ai/docs.test.ts -t "reproduces the ten simulated evaluation cases"`. The test checks prompt inclusion, schema validation and the scripted correction. Run `npx vitest run src/core/ai/ai.test.ts src/core/ai/docs.test.ts src/core/css/api.test.ts` for the wider local prompt and documentation checks after regenerating the schema documentation with `npm run docs:ai`.
