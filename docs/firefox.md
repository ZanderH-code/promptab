# Firefox build and review

Promptab's Firefox build uses the same application bundles as Chromium and generates a separate Manifest V3 extension directory. The Chromium manifest stays in `public/manifest.json`; `scripts/build-firefox.mjs` copies the production build to `dist-firefox/`, removes Chromium's `favicon` permission, and adds the stable Gecko ID and minimum version.

Desktop Firefox 140 is the minimum because the manifest declares Firefox's optional data-collection permissions for user-initiated BYOK requests; desktop Firefox added that consent mechanism in 140. This package does not declare `gecko_android` support. The `optional_host_permissions` key is supported from Firefox 128, MV3 from 109, `storage.sync` from 53, and Web Locks from 96. Firefox sync storage requires a stable extension ID and Firefox Sync, and does not sync extensions on Firefox for Android.

## Build and validate

```bash
npm run build:firefox
npx web-ext lint --source-dir dist-firefox
```

The current lint result has zero errors and three warnings. One `KEY_FIREFOX_ANDROID_UNSUPPORTED_BY_MIN_VERSION` warning reports that Android needs Firefox 142 for data-collection declarations; this package targets desktop Firefox and does not declare Android support. Two `UNSAFE_VAR_ASSIGNMENT` warnings point to the minified React vendor bundle. Mozilla's static rule flags React DOM's internal `innerHTML` handling; these do not point to application code assigning untrusted HTML. Recheck the lint output after dependency or build changes.

The build directory is `dist-firefox/`. Create and validate the distributable archive with:

```bash
npm run package:firefox
```

This writes `store/promptab-firefox-<version>.zip`. The archive contains the extension files at its root and uses forward-slash ZIP entry names. Run the Firefox browser smoke test after building:

```bash
npx playwright install firefox
npx playwright test --config=playwright.firefox.config.ts --workers=1
```

The smoke test opens `dist-firefox` through Vite Preview in Firefox, checks the first screen and settings, and pastes a sample AI theme pack into the existing preview flow. It stubs the extension permission API; it does not test a signed extension or real Firefox Sync account.

For a temporary local install, open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on**, and select `dist-firefox/manifest.json`. Firefox removes temporary add-ons when it closes.

## Compatibility and limitations

- The Chromium manifest remains unchanged. The Firefox manifest keeps `storage`, `unlimitedStorage`, `chrome_url_overrides.newtab`, optional `bookmarks`, and the existing optional host permissions. It adds `browser_specific_settings.gecko.id` (`promptab@zanderh-code.github.io`), `strict_min_version` (`140.0`), and optional data-collection permissions for BYOK authentication information and personal communications, plus weather location information. BYOK and weather request their respective categories alongside the provider host permission after the user starts the action.
- Runtime API access uses one small adapter that prefers Firefox's Promise-based `browser` namespace and falls back to Chromium's `chrome` namespace. No compatibility polyfill is bundled. Firefox `storage.sync`, optional bookmark permissions, optional host permissions, and runtime storage events use the same adapter.
- Both bookmark import and BYOK request optional permissions in the click handler before awaiting other work. Firefox prompts only after a user action; denying access leaves those features unavailable without blocking the app.
- Chromium's private `/_favicon/` endpoint is not used in Firefox. Website icons use the site's `/favicon.ico` and fall back to the saved text or icon when the image cannot load. The site may receive a connection request for that icon.
- Profile and asset writes continue to require Web Locks. Firefox extension pages provide the secure context required by Web Locks; the existing explicit error remains if a browser does not provide the API.
- Video playback depends on the media codecs available in the user's Firefox build and operating system. The poster/image fallback remains available when a video cannot play. This smoke test does not exercise every media codec.
- `storage.sync` is subject to browser quota and account configuration. Users can continue to use profiles locally when Firefox Sync is not configured; sync behavior must be exercised with two Firefox profiles before relying on it for cross-device backup.
- Firefox's temporary install and a web preview are not equivalent to an AMO-signed install. Validate permission prompts, storage, favicon fallback and media again with the signed artifact before release.

## AMO submission checklist

Do not submit the add-on until the release owner chooses the timing. When submission is approved:

1. Run the full Vitest, TypeScript, Chromium build, Chromium Playwright and Firefox smoke checks. Build and lint a fresh Firefox artifact.
2. Review `npx web-ext lint --source-dir dist-firefox`; fix every error and document any remaining warning with its reason.
3. Sign in to the Mozilla Add-ons Developer Hub, create the listing, upload `store/promptab-firefox-<version>.zip`, and select the appropriate source-code submission when AMO requires source for minified JavaScript.
4. Complete the listing title, descriptions, screenshots, categories, support contact, privacy disclosures and data-collection answers. Explain optional host permissions and the optional bookmarks permission.
5. Submit for review only when the release owner directs it. Install the signed result from AMO and verify new-tab replacement, persistence, optional permissions, sync and video fallback before announcing availability.

## References

- [Firefox `optional_host_permissions`](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/optional_host_permissions)
- [Mozilla Firefox 128 MV3 updates](https://blog.mozilla.org/addons/2024/07/10/manifest-v3-updates-landed-in-firefox-128/)
- [Firefox `storage.sync`](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/sync)
- [Firefox `permissions.request()`](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/permissions/request)
- [Web Locks API browser support](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API)
- [Mozilla WebExtension API differences](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Differences_between_API_implementations)
