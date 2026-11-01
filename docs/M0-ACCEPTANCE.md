# M0 acceptance record

Date: 2026-10-31. Environment: Windows 11, Chromium installed by Playwright 1.64.1. Tests run against the production Vite preview on port 4173.

## Delivered

- Keyed English / Simplified Chinese dictionaries, typed message keys and parameter interpolation; errors carry message references.
- App split into app, core, storage, widgets, features and ui modules.
- Cascade layer order: guard, reset, tokens, base, widgets, theme, user. Root theme tokens are inherited by Radix portals; derived colors use OKLCH mixing. Component CSS literal-color regression check passes.
- Shared content width, fixed shortcut cell width and column count as a maximum; compact centered groups, mobile wrapping, Lucide icons with 1.5px strokes and tabular clock numerals.
- Complete v1 JSON backups: settings, shortcuts (including uploaded icons) and optional wallpaper. Import validates kind, version, settings and wallpaper MIME/base64/decoded size before confirmation. Write failures attempt rollback of both stores; rollback failure has a separate error message.
- Four deterministic screenshots in `e2e/baselines/`, with Playwright clock fixed to 2026-10-31 10:24 UTC.
- English and Chinese README instructions for backup and browser tests.

## Automated verification

- `npm run test -- --run`: 26 tests across 6 files.
- `npx tsc -b`: passes.
- `npm run build`: passes.
- `npm run test:e2e`: 8 tests, including four screenshot comparisons.
- `git diff --check`: passes.

Browser checks cover 1440×900, 1920×1080, 800×600 and 400×800; search and heading widths match and no horizontal overflow is detected. Split/reversed layouts with 15 websites and maximum icon size are also checked at all four sizes. Runtime page errors fail browser tests.

Backup browser flow changes the accent, uploads wallpaper, adds a website, downloads a backup, resets settings, removes wallpaper, imports the downloaded file and checks exact persisted settings and the restored wallpaper. Separate checks reject malformed JSON and cancel a valid import without changing persisted data.

Language switching is exercised in a 400px viewport. Portal selected-item color is checked after accent changes in both dark and light themes.

## Review corrections

The M0 review fixes restore a paper-colored light background (the existing background setting applies in dark mode), derive panel and translucent search surfaces from the current background, and add recovery import when saved settings cannot be read. Rollback snapshots preserve the raw stored value, including invalid JSON or an absent entry. Component `!important` declarations and superseded layout rules have been removed.

Latest verification: 31 unit tests and 11 Playwright tests pass, as do TypeScript and the production build. Four dark baselines were regenerated and `light-1440x900.png` was added; the light clock/background contrast is checked against 4.5:1. These results do not replace the unverified Edge and accessibility items below.

## DESIGN §11 coverage and limits

| Checklist item | M0 status |
| --- | --- |
| Four viewport sizes without misalignment / overflow | Screenshots inspected; automated width and overflow checks pass |
| Nine presets and contrast | Deferred to M2; presets and contrast guardrails are not implemented |
| No literal component CSS colors | Regression test passes; tokens.css is the only exception |
| Complete keyboard operation | Partial existing support; full keyboard acceptance and closing all overlays remain unverified, edit-mode work belongs to M3 |
| Reduced motion / transparency | Existing reduced-motion CSS retained; no glass effect implemented; dedicated preference checks remain unverified |
| Chinese / English without truncation or jumps | Switching and overflow checked at 400px; exhaustive settings-text inspection remains unverified |
| Local first visible frame under 100ms | Measured in Playwright 1.64.1 on Windows 11 Chromium: fresh-profile app frame 103.5–122.5ms across three contexts; existing-profile cold/warm frames 46.5–52.4ms. The cold fresh-profile target remains unmet in this environment |

## Outstanding issues

- **M2 — light-theme accent contrast:** The default accent `#90d5cd` has insufficient contrast when used for text and icons in light mode, including the eyebrow, search icon and example text icon. Use a mode-specific accent or automatically darken `--mnt-accent` in light mode, and include it in the contrast guardrails.
- **M2 — light-theme background control:** The background-color setting remains visible in light mode but has no effect. Store background colors per mode using the v2 `colorLight` model; until then, the control can be hidden or disabled in light mode to avoid confusion.
- **M1 — recovery language:** The recovery screen for damaged settings currently always uses Chinese. Make it follow the system language.

Edge loading of the unpacked extension, browser favicon API behavior and manual pointer/keyboard drag-and-drop have not been verified in a real extension context. Production browser preview checks use localStorage and IndexedDB. Screenshot baselines reflect Windows font rendering and may need platform-specific handling elsewhere.

The M0 work is local on `feat/m0-foundations` and has not been pushed.
