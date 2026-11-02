# Startup performance

Measured on Windows Chromium using the production build at `dedd344`, with an existing profile containing a website, no custom CSS, and the settings drawer closed.

| Script | Raw bytes | Gzip bytes |
| --- | ---: | ---: |
| App entry | 297,175 | 94,725 |
| React runtime | 187,044 | 58,772 |
| Theme bootstrap | 1,403 | 674 |
| **Total** | **485,622** | **154,171** |

After the privacy-link change at `925ccbf`, the same test measured **485,692 bytes raw / 154,218 bytes gzip** (485.7 KB / 154.2 KB). The table above preserves the baseline measurement. Moving React into a separate chunk improves caching but does not reduce this total. The entry alone is not the startup budget. Gzip sizes are calculated separately for each decoded script response using Node's `gzipSync`; the extension reads packaged files locally, and the preview server need not serve gzip.

`e2e/startup-performance.spec.ts` listens to every `.js` response during a saved profile reload. It includes static imports, modulepreloads, and the synchronous theme bootstrap, then waits for network idle so that a late import cannot escape the budget. It asserts a total of at most **520,000 raw bytes**, with no settings interaction, and prints raw/gzip totals and the individual scripts. Settings, AI, the CSS sanitizer (when custom CSS is absent), the CSS editor, and the brand catalog remain on demand.

Run the production checks with:

```bash
npx playwright test e2e/startup-performance.spec.ts --workers=1
```

The companion paint test measures fresh, cold-cache, and warm-cache loads. In the local run, browser first paint was 16–24 ms and the rendered app frame was 46–93 ms. Its regression limit is 300 ms for the app frame; the design target remains 100 ms for first paint. These local measurements do not predict slower devices.

`public/theme-bootstrap.js` runs synchronously before the module entry to restore cached theme tokens. The extension CSP retains `script-src 'self'`.

Further reductions to editor, drag-and-drop, and schema code are deferred to the post-release items in `PLAN.md`.
