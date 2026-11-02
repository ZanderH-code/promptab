# Startup performance

Measured on Windows Chromium against production builds, with an existing profile containing one website, no custom CSS, and the settings drawer closed. Each row is a decoded JavaScript response; gzip sizes are calculated separately with Node's `gzipSync`. The packaged extension reads local files, and the preview server need not serve gzip.

| Startup script | Before raw | Before gzip | After raw | After gzip |
| --- | ---: | ---: | ---: | ---: |
| App entry | 312,457 | 100,013 | 263,421 | 83,520 |
| React runtime | 187,044 | 58,772 | 187,044 | 58,772 |
| Theme bootstrap | 1,403 | 674 | 1,403 | 674 |
| **Total** | **500,904** | **159,459** | **451,868** | **142,966** |

The saved-profile startup total falls by **49,036 raw bytes (9.8%)** and **16,493 gzip bytes (10.3%)**. React is a separate chunk for caching and is included in both totals. The editing module and dnd-kit load on the first edit or group-management action, and the shortcut editor loads when opened. The initial grid remains visible while the editing module downloads; controls that depend on it reserve their space and are disabled until ready. The onboarding card stays eager: it is small, is immediately needed by fresh profiles, and keeping its initial layout avoids a loading shift.

Full Zod validation, the profile ranges used by validation, and the schema issue message table remain on the startup path because profile normalization, validation errors, and corrupted-profile recovery depend on them. Settings reset defaults and settings-only controls remain behind the settings drawer. Delaying validation merely by moving it into another startup chunk would not reduce total downloaded bytes.

`e2e/startup-performance.spec.ts` listens to every `.js` response during a saved-profile reload. It includes static imports, modulepreloads, and the synchronous theme bootstrap, then waits for network idle so a late import cannot escape the **480,000 raw byte** budget. The first-use interaction test delays the editing module and checks that the loaded grid and clock keep their positions, then verifies the first drag and shortcut editor on desktop and mobile viewports.

In the same local environment, the companion paint test produced the following milliseconds. First paint and first contentful paint are browser paint entries; the app frame is two animation frames after the clock and settings entry mount. Single local measurements vary and do not predict slower devices.

| Profile and cache | Before first paint | Before contentful paint | Before app frame | After first paint | After contentful paint | After app frame |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Fresh | 32 | 60 | 93.3 | 36 | 52 | 93.3 |
| Existing, cold cache | 12 | 32 | 38.7 | 20 | 40 | 51.7 |
| Existing, warm cache | 12 | 36 | 41.5 | 16 | 16 | 48.7 |

The automated app-frame regression limit is 300 ms; the design target remains 100 ms for first paint. The frame does not imply wallpaper, custom CSS, or font completion. `public/theme-bootstrap.js` runs synchronously before the module entry to restore cached theme tokens; the extension CSP retains `script-src 'self'`.

Run the production checks with:

```bash
npx playwright test e2e/startup-performance.spec.ts e2e/startup-interactions.spec.ts --workers=1
```
