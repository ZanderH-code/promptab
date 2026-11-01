# Minimal New Tab CSS API (version 1)

Custom CSS may rely on exactly the names below. Anything else (other class names, DOM structure) can change in any release.
Removing or renaming a name here is a breaking change and raises the API version.

## How custom CSS is applied

- Your CSS is wrapped in `@layer user`, which comes after every built-in layer, so ordinary rules win without `!important`.
- A guard layer keeps the settings button, the preview banner and the safe-mode banner visible whatever the CSS says. Rules that try to hide or cover them are ignored, and unreachable CSS is rolled back automatically.
- Not allowed: `@import`, external `url()` (only `data:image` is allowed), `expression()`, `behavior`, and `javascript:`. Limits: 64 KB and 2000 rules.
- Open the page with `#safe` (or press Esc three times) to pause custom CSS.
- Write colours in the theme (`theme.color`), not in CSS; read them with the variables below.

## Classes

| Selector | Meaning |
| --- | --- |
| `.mnt-root` | The page root. Theme variables and the background live here. |
| `.mnt-header` | The top bar with the brand and the settings button. Protected. |
| `.mnt-settings-entry` | The settings button. Protected: custom CSS cannot hide, move or cover it. |
| `.mnt-area` | One named responsive layout area. Carries `data-area` with its area name. |
| `.mnt-widget` | Every widget block. Combine with `data-widget` to pick one. |
| `.mnt-clock` | The time text. |
| `.mnt-date` | The date line under the clock. |
| `.mnt-search` | The search form. |
| `.mnt-search-input` | The search text field. |
| `.mnt-group` | One bookmark group. |
| `.mnt-group-title` | The title of a bookmark group. |
| `.mnt-link` | One bookmark tile. Carries `data-link-host` with the site host. |
| `.mnt-link-icon` | The tile icon. |
| `.mnt-link-name` | The tile label. |

## Attribute selectors

| Selector | Meaning |
| --- | --- |
| `[data-area="clock"]` | A layout area named clock. |
| `[data-area="overview"]` | The default clock and search area. |
| `[data-area="bookmarks"]` | The default bookmarks area. |
| `[data-widget="clock"]` | The clock widget. |
| `[data-widget="date"]` | The date widget. |
| `[data-widget="search"]` | The search widget. |
| `[data-widget="bookmarks"]` | The bookmarks widget. |
| `[data-widget="greeting"]` | A greeting widget. |
| `[data-widget="text"]` | A text widget. |
| `[data-widget="spacer"]` | A spacing widget. |
| `[data-link-host="github.com"]` | A bookmark tile for one site; replace `github.com` with any host. |
| `[data-theme-mode="dark"]` | The page while the dark palette is in use. |
| `[data-theme-mode="light"]` | The page while the light palette is in use. |

## Variables you may read

`--mnt-bg`, `--mnt-bg-elevated`, `--mnt-surface`, `--mnt-surface-hover`, `--mnt-surface-active`, `--mnt-text`, `--mnt-text-muted`, `--mnt-text-faint`, `--mnt-accent`, `--mnt-accent-soft`, `--mnt-accent-strong`, `--mnt-accent-text`, `--mnt-on-accent`, `--mnt-border`, `--mnt-border-strong`, `--mnt-danger`, `--mnt-radius`, `--mnt-glass`, `--mnt-scale`, `--mnt-density`, `--mnt-font-display`, `--mnt-font-ui`, `--mnt-font-mono`, `--mnt-text-xs`, `--mnt-text-sm`, `--mnt-text-md`, `--mnt-text-lg`, `--mnt-text-xl`, `--mnt-text-clock`, `--mnt-space-1`, `--mnt-space-2`, `--mnt-space-3`, `--mnt-space-4`, `--mnt-space-5`, `--mnt-space-6`, `--mnt-space-7`, `--mnt-space-8`, `--mnt-space-9`, `--mnt-elev-1`, `--mnt-elev-2`, `--mnt-elev-3`, `--mnt-dur-fast`, `--mnt-dur-base`, `--mnt-dur-slow`, `--mnt-ease`, `--mnt-icon-size`, `--mnt-icon-radius`, `--mnt-columns`, `--mnt-content-width`

## Example

```css
.mnt-clock { letter-spacing: -0.02em; text-transform: uppercase; }
.mnt-link:hover .mnt-link-icon { box-shadow: 0 0 0 2px var(--mnt-accent); }
@media (prefers-reduced-motion: no-preference) {
  .mnt-link-icon { transition: box-shadow var(--mnt-dur-base) var(--mnt-ease); }
}
```
