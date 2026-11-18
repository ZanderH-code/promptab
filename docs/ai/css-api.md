# Promptab CSS API (version 1)

Custom CSS may rely on exactly the names below. Anything else (other class names, DOM structure) can change in any release.
The `mnt` prefix is historical and will remain stable long-term. Removing or renaming a name here is a breaking change and raises the API version.

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
| `.mnt-header` | The top bar with the settings button. Protected. |
| `.mnt-settings-entry` | The settings button. Protected: custom CSS cannot hide, move or cover it. |
| `.mnt-layout` | The responsive layout grid; carries template, breakpoint and edit-mode attributes. |
| `.mnt-area` | One named layout area. Carries `data-area` with its area name. Transparent by default. |
| `.mnt-widget` | Every widget block. Combine with `data-widget` to pick one. |
| `.mnt-widget-frame` | The same element as `.mnt-widget`: the transparent frame around one widget, carrying its type and ID. |
| `.mnt-widget-toolbar` | The toolbar widget action container. |
| `.mnt-bookmark-tile` | The whole websites widget when it uses the tile style, not one website (that is `.mnt-link` / `.mnt-link-icon`). Transparent by default: a border, background or shadow here draws one big box around every website. |
| `.mnt-bookmark-list` | The whole websites widget when it uses the list style, not one website (that is `.mnt-link` / `.mnt-link-icon`). Transparent by default: a border, background or shadow here draws one big box around every website. |
| `.mnt-bookmark-minimal` | The whole websites widget when it uses the minimal style, not one website (that is `.mnt-link` / `.mnt-link-icon`). Transparent by default: a border, background or shadow here draws one big box around every website. |
| `.mnt-bookmark-card` | The whole websites widget when it uses the card style, not one website (that is `.mnt-link` / `.mnt-link-icon`). Transparent by default: a border, background or shadow here draws one big box around every website. |
| `.mnt-bookmark-icon-only` | The whole websites widget when it uses the icon-only style, not one website (that is `.mnt-link` / `.mnt-link-icon`). Transparent by default: a border, background or shadow here draws one big box around every website. |
| `.mnt-clock` | The large time text, set in `theme.font.display`. |
| `.mnt-date` | The date line under the clock, written in the interface language (Chinese text in a Chinese interface), so wide letter-spacing and uppercase do not suit it. |
| `.mnt-search` | The search bar: a wide rounded pill with a hairline border, a surface background, a search icon, a `/` key hint and a submit arrow. Style the bar’s border, background, radius and shadow here; use `:focus-within` for its focused look. |
| `.mnt-search-input` | The bare text field inside the search bar, transparent and borderless on purpose. Change only font, colour or caret-color here: a border, background or shadow draws a second box inside the bar. |
| `.mnt-group` | The same element as `.mnt-bookmark-<style>`: the whole websites widget with all of its groups, not one group. |
| `.mnt-group-title` | The heading row above a group of websites: a small muted label, a hairline rule filling the row and a count. It already has its rule, so do not add borders. |
| `.mnt-group-title-hidden` | A group title whose text is hidden visually but kept for screen readers. |
| `.mnt-link` | One website: its icon tile with the name below. Carries `data-link-host` with the site host. |
| `.mnt-link-icon` | A website’s icon tile, tinted with the site’s brand colour. Its shape and size come from `theme.iconShape` and `theme.iconSize`. |
| `.mnt-link-name` | The website name under its icon. |
| `.mnt-folder` | A bookmark folder entry in the websites grid. |
| `.mnt-folder-preview` | The folder entry’s miniature icon preview. |
| `.mnt-folder-name` | The folder entry’s name. |
| `.mnt-folder-dialog` | The open folder dialog containing its websites. |
| `.mnt-folder-backdrop` | The full-viewport overlay behind an open folder dialog. |

## Attribute selectors

| Selector | Meaning |
| --- | --- |
| `[data-area="clock"]` | A layout area named clock. |
| `[data-area="overview"]` | The default clock and search area. |
| `[data-area="bookmarks"]` | The default bookmarks area. |
| `[data-area="banner"]` | The banner template’s banner area. |
| `[data-area="websites"]` | The banner template’s websites area. |
| `[data-area="divider"]` | The icon-split template’s divider area. |
| `[data-area="date"]` | The dashboard date area. |
| `[data-area="search"]` | The dashboard search area. |
| `[data-area="links"]` | The dashboard links area. |
| `[data-layout-template="stacked"]` | The stacked layout. |
| `[data-layout-template="split"]` | The split layout. |
| `[data-layout-template="top-grid"]` | The top-grid layout. |
| `[data-layout-template="websites"]` | The websites layout. |
| `[data-layout-template="zen"]` | The zen layout. |
| `[data-layout-template="dashboard"]` | The dashboard layout. |
| `[data-layout-template="icon-split"]` | The icon-split layout. |
| `[data-layout-template="banner"]` | The banner layout. |
| `[data-breakpoint="wide"]` | The wide viewport breakpoint. |
| `[data-breakpoint="medium"]` | The medium viewport breakpoint. |
| `[data-breakpoint="narrow"]` | The narrow viewport breakpoint. |
| `[data-edit-mode]` | Present on the layout while editing bookmarks. |
| `[data-widget-id="clock"]` | A widget frame by ID; replace `clock` with the configured ID. |
| `[data-widget="clock"]` | The clock widget. |
| `[data-widget="date"]` | The date widget. |
| `[data-widget="search"]` | The search widget. |
| `[data-widget="bookmarks"]` | The bookmarks widget. |
| `[data-widget="greeting"]` | A greeting widget. |
| `[data-widget="text"]` | A text widget. |
| `[data-widget="spacer"]` | A spacing widget. |
| `[data-widget="toolbar"]` | The toolbar widget. |
| `[data-link-host="github.com"]` | A bookmark tile for one site; replace `github.com` with any host. |
| `[data-folder]` | A folder entry or dialog; its value is the bookmark group ID. |
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
