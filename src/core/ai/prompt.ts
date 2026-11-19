import { CSS_API_ATTRIBUTES, CSS_API_CLASSES, CSS_API_VARIABLES } from '../css/api'
import { CLASS_NOTES } from '../css/notes'
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
  /** Describe the page around the theme (mode, background kind, layout, widget types); never names or URLs. */
  page?: ProfileV2 | null
  /** The colour scheme the page shows right now, which decides what `mode: "system"` looks like. */
  scheme?: 'dark' | 'light'
}

export type RefineOptions = PromptOptions & {
  /** The pack the person is looking at, which the AI should change rather than start over. */
  pack: unknown
  /** What to change, in the person's own words. */
  change: string
  /**
   * Repeat the whole prompt pack. Needed when the request goes to a fresh conversation (a direct API call);
   * a reply in the same chat only needs the change and the pack.
   */
  full?: boolean
}

/** The slim, human-readable field reference sent to the AI. `schema.test.ts` checks that it names every key. */
export function slimSchema(): string {
  const r = RANGES
  return [
    '{',
    `  "kind": "${PACK_KIND}",                 // required text, always this value`,
    '  "packVersion": 2,',
    '  "cssApiVersion": 1, // optional CSS API version',
    '  "variables": [{ "name": "--glow", "label": { "en": "Glow", "zh-CN": "光晕" }, "type": "range", "min": 0, "max": 20, "unit": "px", "default": 4 }], // optional; range, color, toggle, select',
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
    background: { type: type === 'image' || type === 'video' ? 'theme' : type, ...(color ? { color } : {}), ...(gradient ? { gradient } : {}), dim },
    ...(profile.custom.css.trim() ? { css: profile.custom.css } : {}),
  }
}

type Copy = (typeof COPY)[Language]

/**
 * What the page looks like around the theme, in words: the mode it shows, what is behind it, how it is laid
 * out and which widgets it has. Carries no names, addresses, wallpaper or text the person wrote.
 */
export function pageContext(profile: ProfileV2, language: Language, scheme: 'dark' | 'light' = 'dark'): string {
  const c: Copy = COPY[language]
  const showing = profile.theme.mode === 'system' ? scheme : profile.theme.mode
  const { type, dim } = profile.background
  const background = type === 'image' || type === 'video' ? c.pageWallpaper(type, dim) : c.pageBackground[type]
  const widgets = [...profile.widgets].sort((a, b) => a.order - b.order).map(widget => {
    const style = widget.type === 'bookmarks' && typeof widget.props.style === 'string' ? ` (${widget.props.style})` : ''
    return `\`${widget.type}\`${style} → ${widget.area}`
  })
  return [
    `- ${c.pageMode(profile.theme.mode, showing)}`,
    `- ${background}`,
    `- ${c.pageLayout}: ${profile.layout.areas.map(row => `"${row}"`).join(' / ')}`,
    `- ${c.pageWidgets}: ${widgets.join(', ') || '-'}`,
  ].join('\n')
}

const json = (value: unknown) => '```json\n' + JSON.stringify(value, null, 2) + '\n```'

const COPY = {
  'zh-CN': {
    role: '你在为 Promptab 设计一个新标签页主题包。用户会把你的回复粘贴进扩展，由扩展校验、预览并应用。Promptab 只在本地处理数据；用户可以用自己已经在用的任何 AI，不需要账号、API key 或额外额度。',
    output: '输出约定',
    outputRules: [
      `只输出**一个** \`json\` 代码块，\`kind\` 必须是 \`${PACK_KIND}\`。代码块之外可以用一两句话说明设计思路。`,
      '不确定的字段直接省略，不要编造；只写你想改变的部分，未写的部分保持用户当前设置。',
      '颜色一律写成 #RRGGBB；数字写成数字，不要带单位。',
      '需要图片时不要引用网址，在 `meta.notes` 里说明适合什么样的壁纸，让用户自行上传。',
      '只有用户明确要求调整布局或组件时才写 `layout` 和 `widgets`；只是换风格时不要写，它们会改动用户已有的排版。',
      '`theme` 里一定要写 `mode`，并给出这个模式要用的配色：深色写 `color`，浅色写 `colorLight`，`system` 两套都写。只写另一个模式的配色，用户在当前模式下看不到任何变化。',
      '在 `meta.name` 里起一个简短的名字，在 `meta.description` 里用一句话说明这套设计，用户会在应用前看到它。',
    ],
    schema: '字段参考',
    api: 'CSS API（只能依赖这些）',
    apiIntro: '自定义 CSS 放在 `css` 字段里，由扩展包进 `@layer user`。只能使用下面的公开类名、属性选择器和 `--mnt-*` 变量；不要依赖其他类名。',
    classes: '类名（每个类实际对应的元素）',
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
      '字距：大号时钟数字可以略收紧（约 -0.02em）；中文文字不加字距。',
    ],
    look: '页面现在的样子',
    lookText: '居中的大号时钟，下面一行日期；再下面是一条宽幅圆角胶囊搜索栏（细边框加表面底色，左边搜索图标，右边 / 提示和提交箭头）；然后是网站区：每组网站上方有一行「小标签 + 贯穿的细线 + 数量」的标题，每个网站是一个带品牌色底的图标块加名称。设置按钮在右上角。你的 CSS 是在这个基础上微调，不要重画已经存在的边框和底色。',
    mistakes: '常见错误（会让页面变丑）',
    mistakeRules: [
      '给 `.mnt-bookmark-*` 或 `.mnt-group` 加边框、背景或阴影：它们是整个网站区，会把所有网站框成一个大方块。单个网站用 `.mnt-link-icon`。',
      '给 `.mnt-search-input` 加边框、背景或阴影：它是搜索栏里透明的文本框，会在胶囊里再画出一个框。搜索栏的样式写在 `.mnt-search` 上，聚焦效果用 `.mnt-search:focus-within`。',
      '给 `.mnt-group-title` 加边框：它已经有一条细线，会变成两条线。',
      '给日期、分组标题、网站名加大字距或 `text-transform: uppercase`：中文界面里它们是中文，字距超过 0.05em 会显得松散。',
      '为了“有设计感”给所有元素都加辉光、描边和阴影：只给一个焦点（时钟或搜索栏）加效果，其他保持安静。',
    ],
    examples: '示例',
    exampleColors: '示例 1：只改配色和形状',
    exampleFull: '示例 2：含渐变背景和 CSS',
    layoutGuide: '布局和组件',
    layoutGuideText: 'areas 是 CSS 网格区域名称的字符串数组；columns/rows 使用受限的 CSS track 值。breakpoints 可覆盖 narrow/medium 网格。areaStyles 仅支持背景、透明度、模糊、内边距、通栏和边框。widgets 必须使用受支持的组件类型、有效属性，并且 area 必须存在于每个适用网格中。布局示例把时钟和日期放进右侧横幅，搜索栏和网站留在下方；不要隐藏用户的网站或搜索栏。',
    current: '用户当前的配置（不含书签）',
    request: '用户的需求',
    none: '（用户没有写具体需求，请给出一个克制、好看的方案。）',
    page: '用户页面的实际情况',
    pageMode: (mode: string, showing: string) => `主题模式 \`${mode}\`，现在显示的是${showing === 'light' ? '浅色' : '深色'}`,
    pageWallpaper: (type: string, dim: number) => `背景是用户自己上传的${type === 'video' ? '视频' : '图片'}壁纸（遮罩 ${dim}）：保留壁纸，面板和网站要在壁纸上清晰可读，可以用 \`glass\` 和 \`dim\``,
    pageBackground: { theme: '背景是主题底色', color: '背景是纯色', gradient: '背景是渐变', accent: '背景是强调色', image: '', video: '' } as Record<string, string>,
    pageLayout: '布局网格（areas）',
    pageWidgets: '组件（类型 → 区域，按顺序）',
    refine: '修改上一次的主题包',
    refinePack: '当前的主题包',
    refineChange: '要做的修改',
    refineRules: '只改动上面提到的地方，其余保持不变。在一个 `json` 代码块中输出修改后的**完整**主题包。',
  },
  en: {
    role: 'You are designing a new-tab theme pack for Promptab. The user will paste your reply into the extension, which validates, previews and applies it. Promptab processes data locally; the user can use any AI they already use, with no Promptab account, API key or extra AI credits required.',
    output: 'Output rules',
    outputRules: [
      `Reply with exactly **one** \`json\` code block whose \`kind\` is \`${PACK_KIND}\`. You may add a sentence or two outside the block about the design idea.`,
      'Leave out any field you are unsure about instead of inventing it. Write only what you want to change; everything else stays as the user has it.',
      'Write every colour as #RRGGBB and every number as a plain number without units.',
      'Never link to images. If a picture would help, say what kind of wallpaper suits the theme in `meta.notes` and let the user upload one.',
      'Write `layout` and `widgets` only when the user asks to rearrange the page; a new style alone must not touch them, because they change the layout the user already has.',
      'Always set `theme.mode` and give the palette that mode uses: `color` for dark, `colorLight` for light, both for `system`. A palette for the other mode alone changes nothing the user can see.',
      'Give the pack a short `meta.name` and a one-sentence `meta.description` of the idea; the user reads it before applying.',
    ],
    schema: 'Field reference',
    api: 'CSS API (rely on nothing else)',
    apiIntro: 'Custom CSS goes in the `css` field; the extension wraps it in `@layer user`. Use only the public class names, attribute selectors and `--mnt-*` variables below; do not depend on any other class.',
    classes: 'Classes (what each one actually is)',
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
      'Letter-spacing: large clock numerals may tighten slightly (about -0.02em); never add tracking to Chinese text.',
    ],
    look: 'What the page already looks like',
    lookText: 'A large centred clock with a date line below; then a wide rounded pill search bar (hairline border and surface background, a search icon on the left, a / hint and a submit arrow on the right); then the websites: each group has a heading row of a small label, a hairline rule across the row and a count, and each website is an icon tile tinted with its brand colour, with its name below. The settings button is in the top-right corner. Your CSS refines this; do not redraw borders and backgrounds that already exist.',
    mistakes: 'Common mistakes (they make the page look broken)',
    mistakeRules: [
      'A border, background or shadow on `.mnt-bookmark-*` or `.mnt-group`: these are the whole websites area, so every website ends up in one big box. Style single websites with `.mnt-link-icon`.',
      'A border, background or shadow on `.mnt-search-input`: it is the transparent text field inside the search bar, so it draws a second box inside the pill. Style the bar with `.mnt-search` and its focus with `.mnt-search:focus-within`.',
      'A border on `.mnt-group-title`: it already has a hairline rule, so you get two lines.',
      'Wide letter-spacing or `text-transform: uppercase` on the date, group titles or website names: in a Chinese interface they are Chinese, and tracking above 0.05em scatters the characters.',
      'Glow, outlines and shadows on everything to look "designed": give one focal point (the clock or the search bar) an effect and keep the rest quiet.',
    ],
    examples: 'Examples',
    exampleColors: 'Example 1: colours and shape only',
    exampleFull: 'Example 2: gradient background and CSS',
    layoutGuide: 'Layout and widgets',
    layoutGuideText: 'areas is an array of CSS grid area rows; columns and rows use the restricted CSS track grammar. breakpoints may override narrow/medium grids. areaStyles only supports background, opacity, blur, padding, bleed, and borders. widgets must use supported component types and valid props, with each area present in every applicable grid. The layout example puts the clock and date in a right-side banner and keeps the search bar and websites below; never hide the user’s websites or search bar.',
    current: "The user's current setup (bookmarks excluded)",
    request: "The user's request",
    none: '(The user gave no specific request. Offer a restrained, good-looking design.)',
    page: "The user's page as it is now",
    pageMode: (mode: string, showing: string) => `Theme mode \`${mode}\`, currently showing ${showing}`,
    pageWallpaper: (type: string, dim: number) => `The background is ${type === 'video' ? 'a video' : 'an image'} wallpaper the user uploaded (dim ${dim}): keep it, make panels and websites readable over it, and consider \`glass\` and \`dim\``,
    pageBackground: { theme: 'The background is the theme colour', color: 'The background is a solid colour', gradient: 'The background is a gradient', accent: 'The background is the accent colour', image: '', video: '' } as Record<string, string>,
    pageLayout: 'Layout grid (areas)',
    pageWidgets: 'Widgets (type → area, in order)',
    refine: 'Change the theme pack you wrote',
    refinePack: 'The current theme pack',
    refineChange: 'The change',
    refineRules: 'Change only what is asked and keep everything else. Reply with the **complete** changed pack in one `json` code block.',
  },
}

/** The full prompt an AI assistant needs to write a valid theme pack, built offline in the chosen language. */
export function buildPromptPack({ language, request, current, page, scheme }: PromptOptions): string {
  const c = COPY[language]
  const list = (items: readonly string[]) => items.map(item => `- ${item}`).join('\n')
  const code = (items: readonly string[]) => items.map(item => `\`${item}\``).join(', ')
  const parts = [
    `# ${c.role}`,
    `## ${c.output}\n${list(c.outputRules)}`,
    `## ${c.schema}\n\`\`\`\n${slimSchema()}\n\`\`\``,
    `## ${c.look}\n${c.lookText}`,
    `## ${c.api}\n${c.apiIntro}\n\n**${c.classes}**\n${CSS_API_CLASSES.map(name => `- \`.${name}\`: ${CLASS_NOTES[name][language === 'zh-CN' ? 'zh' : 'en']}`).join('\n')}\n\n- ${c.attributes}: ${code(CSS_API_ATTRIBUTES)}\n- ${c.variables}: ${code(CSS_API_VARIABLES)}\n\n${c.cssLimits}`,
    `## ${c.design}\n**${c.must}**\n${list(c.mustRules)}\n\n**${c.mustNot}**\n${list(c.mustNotRules)}\n\n**${c.mistakes}**\n${list(c.mistakeRules)}\n\n**${c.advice}**\n${list(c.adviceRules)}`,
    `## ${c.layoutGuide}\n${c.layoutGuideText}`,
    `## ${c.examples}\n### ${c.exampleColors}\n${json(EXAMPLES[0].pack)}\n\n### ${c.exampleFull}\n${json(EXAMPLES[1].pack)}\n\n### ${c.layoutGuide}\n${json(EXAMPLES[2].pack)}`,
  ]
  if (page) parts.push(`## ${c.page}\n${pageContext(page, language, scheme)}`)
  if (current) parts.push(`## ${c.current}\n${json(currentConfig(current))}`)
  parts.push(`## ${c.request}\n${request?.trim() || c.none}`)
  return parts.join('\n\n') + '\n'
}

/**
 * A follow-up asking the AI to change a pack instead of starting over. In the same chat only the change and
 * the pack are needed; `full` repeats the whole prompt pack for a request that starts a fresh conversation.
 */
export function buildRefinePrompt({ pack, change, full, ...options }: RefineOptions): string {
  const c = COPY[options.language]
  const followUp = [
    `## ${c.refine}`,
    // A reply that did not parse is passed on as its text, so the AI can see what it wrote.
    `### ${c.refinePack}\n${typeof pack === 'string' ? '```\n' + pack + '\n```' : json(pack)}`,
    `### ${c.refineChange}\n${change.trim()}`,
    c.refineRules,
  ].join('\n\n') + '\n'
  return full ? `${buildPromptPack(options)}\n${followUp}` : followUp
}
