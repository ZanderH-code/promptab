import { z } from 'zod'
import { CSS_API_ATTRIBUTES, CSS_API_CLASSES, CSS_API_VARIABLES, CSS_API_VERSION } from '../css/api'
import { EXAMPLES } from './examples'
import { aiPackSchema, PACK_KIND, PACK_VERSION } from './pack'

export const CLASS_NOTES: Record<(typeof CSS_API_CLASSES)[number], string> = {
  'mnt-root': 'The page root. Theme variables and the background live here.',
  'mnt-header': 'The top bar with the brand and the settings button. Protected.',
  'mnt-settings-entry': 'The settings button. Protected: custom CSS cannot hide, move or cover it.',
  'mnt-layout': 'The responsive layout grid; carries template, breakpoint and edit-mode attributes.',
  'mnt-widget-frame': 'The outer frame for a profile widget; carries its type and ID.',
  'mnt-widget-toolbar': 'The toolbar widget action container.',
  'mnt-bookmark-tile': 'Bookmarks rendered in tile style.',
  'mnt-bookmark-list': 'Bookmarks rendered in list style.',
  'mnt-bookmark-minimal': 'Bookmarks rendered in minimal style.',
  'mnt-bookmark-card': 'Bookmarks rendered in card style.',
  'mnt-bookmark-icon-only': 'Bookmarks rendered in icon-only style.',
  'mnt-area': 'One named responsive layout area. Carries `data-area` with its area name.',
  'mnt-widget': 'Every widget block. Combine with `data-widget` to pick one.',
  'mnt-clock': 'The time text.',
  'mnt-date': 'The date line under the clock.',
  'mnt-search': 'The search form.',
  'mnt-search-input': 'The search text field.',
  'mnt-group': 'One bookmark group.',
  'mnt-group-title': 'The title of a bookmark group.',
  'mnt-group-title-hidden': 'The group title remains in the accessibility tree while its visual text is hidden.',
  'mnt-link': 'One bookmark tile. Carries `data-link-host` with the site host.',
  'mnt-link-icon': 'The tile icon.',
  'mnt-link-name': 'The tile label.',
  'mnt-folder': 'A bookmark folder entry in the shortcut grid.',
  'mnt-folder-preview': 'The folder entry’s miniature bookmark icon preview.',
  'mnt-folder-name': 'The folder entry’s name.',
  'mnt-folder-dialog': 'The open folder dialog containing its bookmarks.',
  'mnt-folder-backdrop': 'The full-viewport overlay behind an open folder dialog.',
}

export const ATTRIBUTE_NOTES: Record<(typeof CSS_API_ATTRIBUTES)[number], string> = {
  '[data-area="clock"]': 'A layout area named clock.',
  '[data-area="overview"]': 'The default clock and search area.',
  '[data-area="bookmarks"]': 'The default bookmarks area.',
  '[data-area="banner"]': 'The banner template’s banner area.',
  '[data-area="websites"]': 'The banner template’s websites area.',
  '[data-area="divider"]': 'The icon-split template’s divider area.',
  '[data-area="date"]': 'The dashboard date area.',
  '[data-area="search"]': 'The dashboard search area.',
  '[data-area="links"]': 'The dashboard links area.',
  '[data-layout-template="stacked"]': 'The stacked layout.',
  '[data-layout-template="split"]': 'The split layout.',
  '[data-layout-template="top-grid"]': 'The top-grid layout.',
  '[data-layout-template="websites"]': 'The websites layout.',
  '[data-layout-template="zen"]': 'The zen layout.',
  '[data-layout-template="dashboard"]': 'The dashboard layout.',
  '[data-layout-template="icon-split"]': 'The icon-split layout.',
  '[data-layout-template="banner"]': 'The banner layout.',
  '[data-breakpoint="wide"]': 'The wide viewport breakpoint.',
  '[data-breakpoint="medium"]': 'The medium viewport breakpoint.',
  '[data-breakpoint="narrow"]': 'The narrow viewport breakpoint.',
  '[data-edit-mode]': 'Present on the layout while editing bookmarks.',
  '[data-widget-id="clock"]': 'A widget frame by ID; replace `clock` with the configured ID.',
  '[data-widget="toolbar"]': 'The toolbar widget.',
  '[data-widget="clock"]': 'The clock widget.',
  '[data-widget="date"]': 'The date widget.',
  '[data-widget="search"]': 'The search widget.',
  '[data-widget="bookmarks"]': 'The bookmarks widget.',
  '[data-widget="greeting"]': 'A greeting widget.',
  '[data-widget="text"]': 'A text widget.',
  '[data-widget="spacer"]': 'A spacing widget.',
  '[data-link-host="github.com"]': 'A bookmark tile for one site; replace `github.com` with any host.',
  '[data-folder]': 'A folder entry or dialog; its value is the bookmark group ID.',
  '[data-theme-mode="dark"]': 'The page while the dark palette is in use.',
  '[data-theme-mode="light"]': 'The page while the light palette is in use.',
}

const json = (value: unknown) => JSON.stringify(value, null, 2) + '\n'

function cssApiDoc(): string {
  const classes = CSS_API_CLASSES.map(name => `| \`.${name}\` | ${CLASS_NOTES[name]} |`)
  const attributes = CSS_API_ATTRIBUTES.map(name => `| \`${name}\` | ${ATTRIBUTE_NOTES[name]} |`)
  return [
    `# Promptab CSS API (version ${CSS_API_VERSION})`,
    '',
    'Custom CSS may rely on exactly the names below. Anything else (other class names, DOM structure) can change in any release.',
    'The `mnt` prefix is historical and will remain stable long-term. Removing or renaming a name here is a breaking change and raises the API version.',
    '',
    '## How custom CSS is applied',
    '',
    '- Your CSS is wrapped in `@layer user`, which comes after every built-in layer, so ordinary rules win without `!important`.',
    '- A guard layer keeps the settings button, the preview banner and the safe-mode banner visible whatever the CSS says. Rules that try to hide or cover them are ignored, and unreachable CSS is rolled back automatically.',
    '- Not allowed: `@import`, external `url()` (only `data:image` is allowed), `expression()`, `behavior`, and `javascript:`. Limits: 64 KB and 2000 rules.',
    '- Open the page with `#safe` (or press Esc three times) to pause custom CSS.',
    '- Write colours in the theme (`theme.color`), not in CSS; read them with the variables below.',
    '',
    '## Classes',
    '',
    '| Selector | Meaning |',
    '| --- | --- |',
    ...classes,
    '',
    '## Attribute selectors',
    '',
    '| Selector | Meaning |',
    '| --- | --- |',
    ...attributes,
    '',
    '## Variables you may read',
    '',
    CSS_API_VARIABLES.map(name => `\`${name}\``).join(', '),
    '',
    '## Example',
    '',
    '```css',
    '.mnt-clock { letter-spacing: -0.02em; text-transform: uppercase; }',
    '.mnt-link:hover .mnt-link-icon { box-shadow: 0 0 0 2px var(--mnt-accent); }',
    '@media (prefers-reduced-motion: no-preference) {',
    '  .mnt-link-icon { transition: box-shadow var(--mnt-dur-base) var(--mnt-ease); }',
    '}',
    '```',
    '',
  ].join('\n')
}

function llmsTxt(): string {
  return [
    '# Promptab',
    '',
    '> Promptab is your new tab, designed by your AI. This folder explains how to write a theme pack; Promptab has no built-in AI service.',
    '',
    `A theme pack is one JSON object with \`"kind": "${PACK_KIND}"\` and \`"packVersion": ${PACK_VERSION}\`. Every other field is optional: \`theme\`, \`background\`, \`layout\`, \`widgets\` and \`css\`. Reply with one \`json\` code block.`,
    '',
    `The optional \`cssApiVersion\` identifies the CSS API targeted by a pack; the current version is ${CSS_API_VERSION}. Consult the schema for supported values.`,
    '',
    'Layout packs may set grid areas, safe CSS track sizes, breakpoints, area styles, content width, alignment and gap. Widget objects are validated against the supported widget types, known props and each configured grid.',
    '',
    '## Docs',
    '',
    '- [Theme pack schema](theme-pack.schema.json): the JSON Schema for a pack.',
    '- [CSS API](css-api.md): the only classes, attributes and variables custom CSS may use.',
    ...EXAMPLES.map(example => `- [Example: ${example.pack.meta?.name ?? example.id}](examples/${example.id}.json)`),
    '',
    '## Rules',
    '',
    '- Colours are `#RRGGBB`; numbers carry no units; leave out fields you are unsure about.',
    '- Express intent with `theme` and `background` first; add `css` only for effects they cannot express.',
    '- No external URLs, no `!important`, no hiding the settings button, and animation only inside `prefers-reduced-motion: no-preference`.',
    '- Never add personal sites, bookmarks or promotional links.',
    '',
  ].join('\n')
}

/** Every generated file under `docs/ai`, keyed by its path relative to that folder. `scripts/gen-ai-docs.ts` writes them; `docs.test.ts` fails when they drift. */
export function buildDocs(): Record<string, string> {
  const schema = z.toJSONSchema(aiPackSchema, { unrepresentable: 'any' })
  return {
    'theme-pack.schema.json': json({ title: 'Promptab theme pack', ...schema }),
    'css-api.md': cssApiDoc(),
    'llms.txt': llmsTxt(),
    ...Object.fromEntries(EXAMPLES.map(example => [`examples/${example.id}.json`, json(example.pack)])),
  }
}
