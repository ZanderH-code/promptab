import { z } from 'zod'
import { CSS_API_ATTRIBUTES, CSS_API_CLASSES, CSS_API_VARIABLES, CSS_API_VERSION } from '../css/api'
import { CLASS_NOTES as CSS_NOTES } from '../css/notes'
import { EXAMPLES } from './examples'
import { aiPackSchema, PACK_KIND, PACK_VERSION } from './pack'

/** English class notes for the generated docs; the bilingual source is `core/css/notes`. */
export const CLASS_NOTES = Object.fromEntries(Object.entries(CSS_NOTES).map(([name, note]) => [name, note.en])) as Record<(typeof CSS_API_CLASSES)[number], string>

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
  '[data-link-id]': 'A website link; its value is the website ID.',
  '[data-link-url]': 'A website link; its value is the address without scheme or `www.`.',
  '[data-tile-span="wide"]': 'A website set to span two columns in its editor.',
  '[data-tile-span="tall"]': 'A website set to span two rows in its editor.',
  '[data-tile-span="large"]': 'A website set to span two columns and two rows.',
  '[data-tile-backdrop]': 'A website with its own background colour, image or opacity.',
  '[data-tile-faint]': 'A website whose own background plate is below 40% opacity.',
  '[data-tile-hide-icon]': 'A website set to hide its icon in its editor.',
  '[data-part="hour"]': 'The hour part of the clock.',
  '[data-part="minute"]': 'The minute part of the clock.',
  '[data-part="second"]': 'The second part of the clock.',
  '[data-part="meridiem"]': 'The AM/PM part of a 12-hour clock.',
  '[data-separator-accent]': 'On the clock or date when its separators use the accent colour.',
  '[data-corner="top-left"]': 'A toolbar pinned to the top-left corner.',
  '[data-corner="top-right"]': 'A toolbar pinned to the top-right corner.',
  '[data-corner="bottom-left"]': 'A toolbar pinned to the bottom-left corner.',
  '[data-corner="bottom-right"]': 'A toolbar pinned to the bottom-right corner.',
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
