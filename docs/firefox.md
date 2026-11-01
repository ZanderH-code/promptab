# Firefox compatibility assessment

Promptab currently targets Chromium Manifest V3. Firefox supports the core new-tab extension model, but the published Chromium manifest and a small browser-specific API surface need changes before a Firefox build is shipped.

## Compatibility inventory

| Area | Current implementation | Firefox status | Recommended change | Estimate |
| --- | --- | --- | --- | --- |
| New-tab override | `chrome_url_overrides.newtab` in `public/manifest.json` | Supported in Firefox MV2+ and MV3; the replacement must be a bundled local HTML file | Keep the key and add a Firefox packaging smoke test. Add a Firefox-specific manifest only if store metadata or signing requires it | 0.5 day |
| Storage | `storage` and `unlimitedStorage` permissions | Supported. Firefox also uses `unlimitedStorage` for persistent IndexedDB without an additional prompt | Keep the permissions; verify the profile and asset stores in a Firefox profile | 0.5 day |
| Favicon permission | The manifest requests Chromium's `favicon` permission | Firefox does not document the Chromium `favicon` permission | Remove `favicon` from the Firefox manifest | 0.25 day |
| `_favicon` API | `src/core/favicon.ts` builds a `chrome.runtime.getURL('/_favicon/')` URL | `_favicon` is a Chromium-specific internal extension endpoint and is not available in Firefox | Use the existing origin `/favicon.ico` fallback in Firefox, or add a Firefox-native favicon service. Detect the browser capability rather than requesting `_favicon` unconditionally | 0.5–1 day |
| Optional bookmarks permission | `optional_permissions: ["bookmarks"]`, requested through `chrome.permissions` | Firefox supports optional permissions, but permission names and the runtime behavior should be verified against the signed build | Keep the permission in the Firefox manifest and run the request/deny/import flow. Use `browser.permissions` through a compatibility wrapper if needed | 0.5 day |
| API namespace and promises | Runtime code uses `window.chrome.*` for storage, permissions, bookmarks and `_favicon` | Firefox provides `browser.*` with Promise APIs and also a compatibility `chrome.*` namespace, but relying on `chrome.*` makes cross-browser behavior less explicit | Add a small `browserApi` adapter and use it for storage, permissions, bookmarks and runtime URL generation. Keep the Chromium adapter for the Chrome build | 1–2 days |
| Web Locks | `navigator.locks` protects profile bootstrap across tabs | Supported in Firefox 96+ and available in extension pages; it requires a secure context, which extension pages satisfy | Keep the lock and retain the existing failure path for browsers without it | 0.25 day |
| Manifest identity | No Firefox-specific extension ID is present | Firefox signing and update identity normally use `browser_specific_settings.gecko.id` | Add a stable Gecko ID when preparing the Firefox store package; do not add it to the Chromium manifest unless packaging needs it | 0.25 day |
| Extension page details | The app uses local assets, fonts, IndexedDB and blob URLs | These are generally supported, but Firefox extension URLs use a per-install UUID and should not be hard-coded | Keep all asset references relative or generated at runtime; add a packaged smoke test | 0.5 day |

## Suggested implementation order

1. Add a Firefox manifest variant with `browser_specific_settings.gecko.id`, without the Chromium-only `favicon` permission.
2. Introduce a browser API adapter for storage, bookmarks, permissions and runtime URLs.
3. Make `browserFaviconUrl()` capability-based and use the origin favicon fallback when `_favicon` is unavailable.
4. Run the packaged extension in Firefox: new-tab navigation, profile persistence, wallpaper/icon assets, optional bookmark permission denial and acceptance, backup import/export, and recovery.
5. Produce Firefox-specific store metadata and repeat the accessibility and screenshot checks where font rendering differs.

This is an assessment only. No Firefox manifest, adapter, or store submission is included in the current M5 patch.
