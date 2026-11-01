import { CSS_API_ATTRIBUTES, CSS_API_CLASSES, CSS_API_VARIABLES } from '../css/api'
import { FONT_KEYS, isAssetFont } from '../font'
import type { Language } from '../../i18n'
import { RANGES } from '../schema/defaults'
import type { ProfileV2 } from '../schema/profile'
import { EXAMPLES } from './examples'
import { PACK_KIND } from './pack'

export type PromptOptions = {
  language: Language
  /** What the person wants, in their own words. */
  request?: string
  /** Attach the current theme, background and CSS (never bookmarks). */
  current?: ProfileV2 | null
}

/** The slim, human-readable field reference sent to the AI. `schema.test.ts` checks that it names every key. */
export function slimSchema(): string {
  const r = RANGES
  return [
    '{',
    `  "kind": "${PACK_KIND}",                 // required text, always this value`,
    '  "packVersion": 2,',
    '  "meta": { "name": "Short name", "description": "optional", "notes": "optional, e.g. which wallpaper would suit it" },',
    '  "theme": {                              // optional; include only what you change',
    '    "mode": "dark" | "light" | "system",',
    '    "color":      { "bg": "#RRGGBB", "text": "#RRGGBB", "accent": "#RRGGBB", "surface": "#RRGGBB (optional)" },   // palette used in dark mode',
    '    "colorLight": { same four keys },     // palette used in light mode (optional)',
    `    "font": { "display": FONT, "ui": FONT },   // FONT: ${FONT_KEYS.join(' | ')}`,
    `    "radius": number ${r.radius.min}-${r.radius.max},      // corner radius in px`,
    `    "shadow": number ${r.shadow.min}-${r.shadow.max},`,
    `    "glass": number ${r.glass.min}-${r.glass.max},       // frosted-glass strength`,
    '    "density": "compact" | "comfortable" | "spacious",',
    `    "scale": number ${r.scale.min}-${r.scale.max},        // overall size`,
    '    "iconShape": "circle" | "rounded" | "square",',
    '    "iconSize": integer 40-120',
    '  },',
    '  "background": {                         // optional',
    '    "type": "theme" | "color" | "gradient" | "accent",',
    '    "color": "#RRGGBB",                   // when type is "color"',
    '    "gradient": { "angle": number, "stops": ["#RRGGBB", "#RRGGBB"] },   // when type is "gradient", 2-3 stops',
    `    "dim": number ${r.dim.min}-${r.dim.max}               // shade over a wallpaper`,
    '  },',
    '  "css": "string, optional; see the CSS API below",',
    '  "layout": { "areas": ["bookmarks overview"], "columns": ["1fr", "minmax(280px, 0.7fr)"], "rows": ["auto"], "breakpoints": { "narrow": { "areas": ["overview", "bookmarks"], "columns": ["1fr"] } }, "areaStyles": {}, "contentWidth": 1200, "align": "center-center", "gap": 24 },',
    '  "widgets": [{ "id": "clock", "type": "clock", "area": "overview", "order": 0, "props": { "hour12": false } }]',
    '}',
  ].join('\n')
}

/** What the person already has: theme, background and CSS only, with no bookmarks, URLs or uploaded assets. */
export function currentConfig(profile: ProfileV2) {
  const { preset: _preset, font, ...theme } = profile.theme
  const safeFont = (value: string) => (isAssetFont(value) ? 'system' : value)
  const { type, color, gradient, dim } = profile.background
  return {
    theme: { ...theme, font: { display: safeFont(font.display), ui: safeFont(font.ui) } },
    background: { type: type === 'image' ? 'theme' : type, ...(color ? { color } : {}), ...(gradient ? { gradient } : {}), dim },
    ...(profile.custom.css.trim() ? { css: profile.custom.css } : {}),
  }
}

const json = (value: unknown) => '```json\n' + JSON.stringify(value, null, 2) + '\n```'

const COPY = {
  'zh-CN': {
    role: '你在为「Minimal New Tab」浏览器新标签页扩展设计一个主题包。用户会把你的回复粘贴进扩展，由扩展校验、预览并应用。',
    output: '输出约定',
    outputRules: [
      `只输出**一个** \`json\` 代码块，\`kind\` 必须是 \`${PACK_KIND}\`。代码块之外可以用一两句话说明设计思路。`,
      '不确定的字段直接省略，不要编造；只写你想改变的部分，未写的部分保持用户当前设置。',
      '颜色一律写成 #RRGGBB；数字写成数字，不要带单位。',
      '需要图片时不要引用网址，在 `meta.notes` 里说明适合什么样的壁纸，让用户自行上传。',
    ],
    schema: '字段参考',
    api: 'CSS API（只能依赖这些）',
    apiIntro: '自定义 CSS 放在 `css` 字段里，由扩展包进 `@layer user`。只能使用下面的公开类名、属性选择器和 `--mnt-*` 变量；不要依赖其他类名。',
    classes: '类名',
    attributes: '属性选择器',
    variables: '可读取的变量',
    cssLimits: '限制：不允许 @import、外部 url()（只允许 data:image 图片）、expression()；体积 ≤ 64 KB；规则 ≤ 2000 条。',
    design: '设计约束',
    must: '必须',
    mustRules: [
      '只使用 `--mnt-*` 变量和上面列出的选择器；颜色写在 `theme.color` 中，不要写在 CSS 里。',
      '一个强调色；正文对比度 ≥ 4.5:1。',
      '优先用 theme / background 表达意图，只有字段表达不了的效果才写 CSS。',
      'CSS 保持在 200 行以内，不使用 `!important`。',
      '尊重减少动画：任何 `animation` 必须写在 `@media (prefers-reduced-motion: no-preference)` 中。',
    ],
    mustNot: '不要',
    mustNotRules: [
      '引用外部网址（图片、字体、`@import`）。',
      '隐藏或遮挡设置入口；改变 `position` 让组件脱离布局；使用超过 3 种字号。',
      '添加用户的个人网站、真实书签或推广链接。',
      '使用持续闪烁、旋转、彩虹等动画。',
    ],
    advice: '风格建议（用户未指定时）',
    adviceRules: [
      '留白多于内容；时钟或搜索二选一作为视觉焦点。',
      '背景饱和度低（OKLCH C < 0.06），强调色可稍高（C 0.08–0.16）。',
      '字距：大号数字收紧，小号大写英文放宽。',
    ],
    examples: '示例',
    exampleColors: '示例 1：只改配色和形状',
    exampleFull: '示例 2：含渐变背景和 CSS',
    layoutGuide: '布局和组件',
    layoutGuideText: 'areas 是 CSS 网格区域名称的字符串数组；columns/rows 使用受限的 CSS track 值。breakpoints 可覆盖 narrow/medium 网格。areaStyles 仅支持背景、透明度、模糊、内边距、通栏和边框。widgets 必须使用受支持的组件类型、有效属性，并且 area 必须存在于每个适用网格中。布局示例采用右侧横幅区域和隐藏的网站区。',
    current: '用户当前的配置（不含书签）',
    request: '用户的需求',
    none: '（用户没有写具体需求，请给出一个克制、好看的方案。）',
  },
  en: {
    role: 'You are designing a theme pack for the "Minimal New Tab" browser new-tab extension. The user will paste your reply into the extension, which validates, previews and applies it.',
    output: 'Output rules',
    outputRules: [
      `Reply with exactly **one** \`json\` code block whose \`kind\` is \`${PACK_KIND}\`. You may add a sentence or two outside the block about the design idea.`,
      'Leave out any field you are unsure about instead of inventing it. Write only what you want to change; everything else stays as the user has it.',
      'Write every colour as #RRGGBB and every number as a plain number without units.',
      'Never link to images. If a picture would help, say what kind of wallpaper suits the theme in `meta.notes` and let the user upload one.',
    ],
    schema: 'Field reference',
    api: 'CSS API (rely on nothing else)',
    apiIntro: 'Custom CSS goes in the `css` field; the extension wraps it in `@layer user`. Use only the public class names, attribute selectors and `--mnt-*` variables below; do not depend on any other class.',
    classes: 'Classes',
    attributes: 'Attribute selectors',
    variables: 'Variables you may read',
    cssLimits: 'Limits: no @import, no external url() (only data:image), no expression(); at most 64 KB and 2000 rules.',
    design: 'Design constraints',
    must: 'Do',
    mustRules: [
      'Use only `--mnt-*` variables and the selectors above. Put colours in `theme.color`, not in the CSS.',
      'One accent colour; body text contrast of at least 4.5:1.',
      'Express intent with theme / background first; write CSS only for effects the fields cannot express.',
      'Keep the CSS under 200 lines and do not use `!important`.',
      'Respect reduced motion: any `animation` must sit inside `@media (prefers-reduced-motion: no-preference)`.',
    ],
    mustNot: 'Do not',
    mustNotRules: [
      'Reference external URLs (images, fonts, `@import`).',
      'Hide or cover the settings entry, take widgets out of the layout with `position`, or use more than 3 font sizes.',
      "Add the user's personal sites, real bookmarks or promotional links.",
      'Use constant blinking, spinning or rainbow animation.',
    ],
    advice: 'Style advice (when the user does not say)',
    adviceRules: [
      'More whitespace than content; make either the clock or the search the focal point.',
      'Low-saturation background (OKLCH C < 0.06); the accent may be a little stronger (C 0.08-0.16).',
      'Letter-spacing: tighten large numerals, loosen small uppercase Latin text.',
    ],
    examples: 'Examples',
    exampleColors: 'Example 1: colours and shape only',
    exampleFull: 'Example 2: gradient background and CSS',
    layoutGuide: 'Layout and widgets',
    layoutGuideText: 'areas is an array of CSS grid area rows; columns and rows use the restricted CSS track grammar. breakpoints may override narrow/medium grids. areaStyles only supports background, opacity, blur, padding, bleed, and borders. widgets must use supported component types and valid props, with each area present in every applicable grid. The layout example uses a right-side banner area and a hidden websites area.',
    current: "The user's current setup (bookmarks excluded)",
    request: "The user's request",
    none: '(The user gave no specific request. Offer a restrained, good-looking design.)',
  },
} as const

/** The full prompt an AI assistant needs to write a valid theme pack, built offline in the chosen language. */
export function buildPromptPack({ language, request, current }: PromptOptions): string {
  const c = COPY[language]
  const list = (items: readonly string[]) => items.map(item => `- ${item}`).join('\n')
  const code = (items: readonly string[]) => items.map(item => `\`${item}\``).join(', ')
  const parts = [
    `# ${c.role}`,
    `## ${c.output}\n${list(c.outputRules)}`,
    `## ${c.schema}\n\`\`\`\n${slimSchema()}\n\`\`\``,
    `## ${c.api}\n${c.apiIntro}\n\n- ${c.classes}: ${code(CSS_API_CLASSES.map(name => `.${name}`))}\n- ${c.attributes}: ${code(CSS_API_ATTRIBUTES)}\n- ${c.variables}: ${code(CSS_API_VARIABLES)}\n\n${c.cssLimits}`,
    `## ${c.design}\n**${c.must}**\n${list(c.mustRules)}\n\n**${c.mustNot}**\n${list(c.mustNotRules)}\n\n**${c.advice}**\n${list(c.adviceRules)}`,
    `## ${c.layoutGuide}\n${c.layoutGuideText}`,
    `## ${c.examples}\n### ${c.exampleColors}\n${json(EXAMPLES[0].pack)}\n\n### ${c.exampleFull}\n${json(EXAMPLES[1].pack)}\n\n### ${c.layoutGuide}\n${json(EXAMPLES[2].pack)}`,
  ]
  if (current) parts.push(`## ${c.current}\n${json(currentConfig(current))}`)
  parts.push(`## ${c.request}\n${request?.trim() || c.none}`)
  return parts.join('\n\n') + '\n'
}
