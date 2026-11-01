import { z } from 'zod'
import { CSS_API_ATTRIBUTES, CSS_API_CLASSES, CSS_API_VARIABLES, CSS_API_VERSION } from '../css/api'
import { EXAMPLES } from './examples'
import { aiPackSchema, PACK_KIND, PACK_VERSION } from './pack'

export const CLASS_NOTES: Record<(typeof CSS_API_CLASSES)[number], string> = {
  'mnt-root': 'The page root. Theme variables and the background live here.',
  'mnt-header': 'The top bar with the brand and the settings button. Protected.',
  'mnt-settings-entry': 'The settings button. Protected: custom CSS cannot hide, move or cover it.',
  'mnt-area': 'One named responsive layout area. Carries `data-area` with its area name.',
  'mnt-widget': 'Every widget block. Combine with `data-widget` to pick one.',
  'mnt-clock': 'The time text.',
  'mnt-date': 'The date line under the clock.',
  'mnt-search': 'The search form.',
  'mnt-search-input': 'The search text field.',
  'mnt-group': 'One bookmark group.',
  'mnt-group-title': 'The title of a bookmark group.',
  'mnt-link': 'One bookmark tile. Carries `data-link-host` with the site host.',
  'mnt-link-icon': 'The tile icon.',
  'mnt-link-name': 'The tile label.',
}

export const ATTRIBUTE_NOTES: Record<(typeof CSS_API_ATTRIBUTES)[number], string> = {
  '[data-area="clock"]': 'A layout area named clock.',
  '[data-area="overview"]': 'The default clock and search area.',
  '[data-area="bookmarks"]': 'The default bookmarks area.',
  '[data-widget="clock"]': 'The clock widget.',
  '[data-widget="date"]': 'The date widget.',
  '[data-widget="search"]': 'The search widget.',
  '[data-widget="bookmarks"]': 'The bookmarks widget.',
  '[data-widget="greeting"]': 'A greeting widget.',
  '[data-widget="text"]': 'A text widget.',
  '[data-widget="spacer"]': 'A spacing widget.',
  '[data-link-host="github.com"]': 'A bookmark tile for one site; replace `github.com` with any host.',
  '[data-theme-mode="dark"]': 'The page while the dark palette is in use.',
  '[data-theme-mode="light"]': 'The page while the light palette is in use.',
}

const json = (value: unknown) => JSON.stringify(value, null, 2) + '\n'

function cssApiDoc(): string {
  const classes = CSS_API_CLASSES.map(name => `| \`.${name}\` | ${CLASS_NOTES[name]} |`)
  const attributes = CSS_API_ATTRIBUTES.map(name => `| \`${name}\` | ${ATTRIBUTE_NOTES[name]} |`)
  return [
    `# Minimal New Tab CSS API (version ${CSS_API_VERSION})`,
    '',
    'Custom CSS may rely on exactly the names below. Anything else (other class names, DOM structure) can change in any release.',
    'Removing or renaming a name here is a breaking change and raises the API version.',
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
    '# Minimal New Tab',
    '',
    '> A minimal browser new-tab extension whose look is controlled by a JSON theme pack and an optional stylesheet. This folder tells an AI assistant how to write them.',
    '',
    `A theme pack is one JSON object with \`"kind": "${PACK_KIND}"\` and \`"packVersion": ${PACK_VERSION}\`. Every other field is optional: \`theme\`, \`background\` and \`css\`. Reply with one \`json\` code block.`,
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
    'theme-pack.schema.json': json({ title: 'Minimal New Tab theme pack', ...schema }),
    'css-api.md': cssApiDoc(),
    'llms.txt': llmsTxt(),
    ...Object.fromEntries(EXAMPLES.map(example => [`examples/${example.id}.json`, json(example.pack)])),
  }
}
