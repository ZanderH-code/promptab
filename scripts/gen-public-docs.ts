import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { z } from 'zod'
import { CSS_API_ATTRIBUTES, CSS_API_CLASSES, CSS_API_VARIABLES, CSS_API_VERSION } from '../src/core/css/api'
import { CSS_SANITIZER_POLICY, MAX_CSS_BYTES, MAX_CSS_RULES } from '../src/core/css/sanitize'
import { ATTRIBUTE_NOTES, CLASS_NOTES } from '../src/core/ai/docs'
import { aiPackSchema, PACK_KIND, PACK_VERSION } from '../src/core/ai/pack'

const outDir = resolve('docs/docs')
const escapeHtml = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, canonical(child)])) : value

function page(titleEn: string, titleZh: string, description: string, english: string, chinese: string) {
  return `<!doctype html>
<html lang="en" data-title-en="${escapeHtml(titleEn)}" data-title-zh-cn="${escapeHtml(titleZh)}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="${escapeHtml(description)}"><title>${escapeHtml(titleEn)}</title><link rel="icon" href="../brand/logo.svg" type="image/svg+xml"><link rel="stylesheet" href="docs.css"><script src="docs.js" defer></script></head>
<body><a class="skip" href="#main">Skip to content</a><header class="bar"><div class="bar-inner"><a class="brand" href="./">PROMPTAB · DOCS</a><nav class="nav" aria-label="Documentation navigation"><span data-language="en"><a href="./">Docs home</a> · <a href="../">Home</a> · <a href="../gallery/">Gallery</a></span><span data-language="zh-CN" lang="zh-CN" hidden><a href="./">文档首页</a> · <a href="../">主页</a> · <a href="../gallery/">画廊</a></span><button id="language" type="button">中文</button></nav></div></header>
<main id="main"><section data-language="en">${english}</section><section data-language="zh-CN" lang="zh-CN" hidden>${chinese}</section></main><footer class="footer"><nav aria-label="Footer"><a href="./">Docs home / 文档首页</a><a href="design-with-ai.html">Design with AI / 用 AI 设计</a><a href="faq.html">FAQ</a></nav></footer></body></html>
`
}

type SchemaNode = { type?: string | string[]; const?: unknown; enum?: unknown[]; minimum?: number; maximum?: number; minLength?: number; maxLength?: number; minItems?: number; maxItems?: number; pattern?: string; format?: string; default?: unknown; required?: string[]; properties?: Record<string, SchemaNode>; items?: SchemaNode; oneOf?: SchemaNode[]; anyOf?: SchemaNode[]; allOf?: SchemaNode[]; additionalProperties?: boolean | SchemaNode; propertyNames?: SchemaNode }
type Field = { path: string; schema: SchemaNode; required: boolean }

function schemaFields(schema: SchemaNode): Field[] {
  const fields = new Map<string, Field>()
  function visit(node: SchemaNode, path = '', active = new Set<SchemaNode>()) {
    if (active.has(node)) return
    const nextActive = new Set(active).add(node)
    for (const [name, child] of Object.entries(node.properties ?? {})) {
      const fieldPath = path ? `${path}.${name}` : name
      const existing = fields.get(fieldPath)
      fields.set(fieldPath, { path: fieldPath, schema: { ...(existing?.schema ?? {}), ...child }, required: !!node.required?.includes(name) || !!existing?.required })
      visit(child, fieldPath, nextActive)
    }
    if (node.items) visit(node.items, `${path}[]`, nextActive)
    if (node.additionalProperties && typeof node.additionalProperties === 'object') visit(node.additionalProperties, `${path}.*`, nextActive)
    for (const branch of [...(node.oneOf ?? []), ...(node.anyOf ?? []), ...(node.allOf ?? [])]) {
      const tag = branch.properties?.type?.const
      visit(branch, tag === undefined ? path : `${path}[type=${String(tag)}]`, nextActive)
    }
  }
  visit(schema)
  return [...fields.values()].sort((a, b) => a.path.localeCompare(b.path))
}

const jsonText = (value: unknown) => typeof value === 'string' ? value : JSON.stringify(value)
function typeText(schema: SchemaNode): string {
  if (schema.const !== undefined) return `${Array.isArray(schema.type) ? schema.type.join(' | ') : schema.type ?? 'value'} = ${jsonText(schema.const)}`
  if (schema.enum) return `${schema.type ?? 'value'} (${schema.enum.map(jsonText).join(' | ')})`
  const variants = [...(schema.oneOf ?? []), ...(schema.anyOf ?? [])]
  if (variants.length) return variants.map(typeText).join(' | ')
  if (schema.type === 'array') return `array<${schema.items ? typeText(schema.items) : 'any'}>`
  if (schema.properties) return 'object'
  if (schema.type) return Array.isArray(schema.type) ? schema.type.join(' | ') : schema.type
  return schema.items ? `array<${typeText(schema.items)}>` : 'variant'
}
function constraintText(schema: SchemaNode) {
  const values = [schema.minimum !== undefined || schema.maximum !== undefined ? `${schema.minimum ?? '−∞'} to ${schema.maximum ?? '∞'}` : '', schema.minLength !== undefined || schema.maxLength !== undefined ? `${schema.minLength ?? 0} to ${schema.maxLength ?? '∞'} characters` : '', schema.minItems !== undefined || schema.maxItems !== undefined ? `${schema.minItems ?? 0} to ${schema.maxItems ?? '∞'} items` : '', schema.pattern ? `pattern ${schema.pattern}` : '', schema.format ? `format ${schema.format}` : '', schema.propertyNames ? `property names: ${typeText(schema.propertyNames)}` : ''].filter(Boolean)
  if (schema.additionalProperties === false) values.push('no additional properties')
  return values.join('; ') || '—'
}
function requiredText(field: Field) {
  return field.required ? 'Required in its containing object' : 'Optional'
}
function defaultText(field: Field) {
  if (field.schema.default !== undefined) return jsonText(field.schema.default)
  const variants = [...(field.schema.oneOf ?? []), ...(field.schema.anyOf ?? [])]
  const defaults = variants.flatMap(variant => variant.const !== undefined ? [jsonText(variant.const)] : variant.default !== undefined ? [jsonText(variant.default)] : [])
  return defaults.length ? defaults.join(' or ') : 'Not declared'
}
const tableCell = (value: string) => `<td>${escapeHtml(value)}</td>`
function fieldTable(fields: Field[]) {
  return `<div class="table-wrap"><table><thead><tr><th>Field</th><th>Type</th><th>Range / allowed values</th><th>Required?</th><th>Schema default</th></tr></thead><tbody>${fields.map(field => `<tr><td><code>${escapeHtml(field.path)}</code></td>${tableCell(typeText(field.schema))}${tableCell(constraintText(field.schema))}${tableCell(requiredText(field))}${tableCell(defaultText(field))}</tr>`).join('')}</tbody></table></div>`
}
function fieldTableZh(fields: Field[]) {
  return `<div class="table-wrap"><table><thead><tr><th>字段</th><th>类型</th><th>范围 / 可选值</th><th>必填？</th><th>Schema 默认值</th></tr></thead><tbody>${fields.map(field => `<tr><td><code>${escapeHtml(field.path)}</code></td>${tableCell(typeText(field.schema))}${tableCell(constraintText(field.schema))}${tableCell(field.required ? '所在对象中必填' : '可选')}${tableCell(defaultText(field) === 'Not declared' ? '未声明' : defaultText(field))}</tr>`).join('')}</tbody></table></div>`
}

const CLASS_ZH: Record<string, string> = {
  'mnt-root': '页面根容器；主题变量与背景位于此处。', 'mnt-header': '顶部栏，包含品牌和设置入口。', 'mnt-settings-entry': '设置入口，受保护样式保障可用。', 'mnt-layout': '响应式布局网格。', 'mnt-area': '一个具名的布局区域。', 'mnt-widget': '组件块。', 'mnt-widget-frame': '组件外框，带组件类型和 ID。', 'mnt-widget-toolbar': '工具栏组件的操作区域。', 'mnt-bookmark-tile': '平铺样式的书签。', 'mnt-bookmark-list': '列表样式的书签。', 'mnt-bookmark-minimal': '简约样式的书签。', 'mnt-bookmark-card': '卡片样式的书签。', 'mnt-bookmark-icon-only': '仅图标样式的书签。', 'mnt-clock': '时间文字。', 'mnt-date': '日期文字。', 'mnt-search': '搜索表单。', 'mnt-search-input': '搜索输入框。', 'mnt-group': '书签分组。', 'mnt-group-title': '书签分组标题。', 'mnt-group-title-hidden': '视觉上隐藏但仍保留在无障碍树中的分组标题。', 'mnt-link': '单个书签项。', 'mnt-link-icon': '书签图标。', 'mnt-link-name': '书签名称。',
}
function category(name: string) {
  if (/bg|surface|accent|border|danger/.test(name)) return 'Colors and surfaces'
  if (/text|font/.test(name)) return 'Typography'
  if (/space/.test(name)) return 'Spacing'
  if (/elev/.test(name)) return 'Elevation'
  if (/dur|ease/.test(name)) return 'Motion'
  if (/columns|content-width|icon-size|icon-radius/.test(name)) return 'Layout and icons'
  return 'Theme values'
}
function categoryZh(name: string) {
  if (/bg|surface|accent|border|danger/.test(name)) return '颜色与表面'
  if (/text|font/.test(name)) return '排版'
  if (/space/.test(name)) return '间距'
  if (/elev/.test(name)) return '层级阴影'
  if (/dur|ease/.test(name)) return '动效'
  if (/columns|content-width|icon-size|icon-radius/.test(name)) return '布局与图标'
  return '主题数值'
}
function cssTables(layers: string[]) {
  const classEn = CSS_API_CLASSES.map(name => `<tr><td><code>.${name}</code></td><td>${escapeHtml(CLASS_NOTES[name])}</td></tr>`).join('')
  const classZh = CSS_API_CLASSES.map(name => `<tr><td><code>.${name}</code></td><td>${escapeHtml(CLASS_ZH[name] ?? '稳定的公开 CSS 类。')}</td></tr>`).join('')
  const attrEn = CSS_API_ATTRIBUTES.map(name => `<tr><td><code>${escapeHtml(name)}</code></td><td>${escapeHtml(ATTRIBUTE_NOTES[name])}</td></tr>`).join('')
  const attrZh = CSS_API_ATTRIBUTES.map(name => `<tr><td><code>${escapeHtml(name)}</code></td><td>用于按布局、组件或页面状态定位的公开属性选择器。</td></tr>`).join('')
  const tokenEn = CSS_API_VARIABLES.map(name => `<tr><td><code>${name}</code></td><td>${category(name)}</td><td>Read-only theme value</td></tr>`).join('')
  const tokenZh = CSS_API_VARIABLES.map(name => `<tr><td><code>${name}</code></td><td>${categoryZh(name)}</td><td>只读主题变量</td></tr>`).join('')
  const allowedAt = CSS_SANITIZER_POLICY.allowedAtRules.map(name => `<code>@${name}</code>`).join(' · ')
  const forbiddenProps = CSS_SANITIZER_POLICY.forbiddenProperties.map(name => `<code>${name}</code>`).join('、')
  const forbiddenFunctions = CSS_SANITIZER_POLICY.forbiddenFunctions.map(name => `<code>${name}()</code>`).join('、')
  const urlFunctions = CSS_SANITIZER_POLICY.urlStringFunctions.map(name => `<code>${name}()</code>`).join('、')
  return { classEn, classZh, attrEn, attrZh, tokenEn, tokenZh, allowedAt, forbiddenProps, forbiddenFunctions, urlFunctions, layers: layers.map(name => `<code>${escapeHtml(name)}</code>`).join(' → ') }
}

function buildPages() {
  const checkedInSchema = JSON.parse(readFileSync(resolve('docs/ai/theme-pack.schema.json'), 'utf8'))
  const zodSchema = { title: 'Promptab theme pack', ...z.toJSONSchema(aiPackSchema, { unrepresentable: 'any' }) }
  if (JSON.stringify(canonical(checkedInSchema)) !== JSON.stringify(canonical(zodSchema))) throw new Error('docs/ai/theme-pack.schema.json is stale; run npm run docs:ai')
  const fields = schemaFields(checkedInSchema as SchemaNode)
  const pack = page('Theme pack reference | Promptab', '主题包参考 | Promptab', 'Generated reference for every Promptab theme pack v2 field.',
    `<p class="eyebrow">Generated reference · v${PACK_VERSION}</p><h1>Theme pack v${PACK_VERSION}</h1><p class="lead">A theme pack is a JSON object. The optional <code>kind</code> and <code>packVersion</code> markers identify the format; when present, they must be <code>${PACK_KIND}</code> and <code>${PACK_VERSION}</code>. The JSON Schema is generated from the same Zod schema used by the app. Every content part is optional. When a field has no schema default, the table says so; applying a partial pack leaves omitted parts and fields on the active profile unchanged.</p><p class="callout">Colors use hex values. Numeric ranges are inclusive. Required nested fields become required when their containing object is present. Bookmarks and wallpaper images are never applied from a theme pack.</p><h2>Complete field list</h2>${fieldTable(fields)}<h2>Shareable exports</h2><p>When a theme pack is exported from the AI workbench, personal data and local wallpaper, video, and font files are omitted. Portable custom CSS is retained; declarations that reference local assets are removed, and the export dialog reports the number removed. The dialog also offers an option to omit all custom CSS. Downloaded JSON filenames are based on the pack name.</p><h2>How partial packs apply</h2><p>Theme values merge with the current theme. Missing surfaces are derived from supplied colors; font fields merge individually. Background fields merge. Layout fields merge, breakpoint entries merge, and a supplied area-style map replaces the previous map. Widgets with matching IDs and types merge their props; new widget IDs are appended. Supplied CSS replaces and enables custom CSS. Supplied variables replace variable declarations; compatible values are retained only for the same named source pack. See <a href="design-with-ai.html">the AI workflow</a> for safe preview and apply.</p>`,
    `<p class="eyebrow">自动生成的参考 · v${PACK_VERSION}</p><h1>主题包 v${PACK_VERSION}</h1><p class="lead">主题包是一个 JSON 对象。可选的 <code>kind</code> 和 <code>packVersion</code> 标记用于识别格式；若提供，其值必须为 <code>${PACK_KIND}</code> 和 <code>${PACK_VERSION}</code>。JSON Schema 由应用使用的同一份 Zod schema 生成。所有内容部分均可选。没有 schema 默认值的字段会明确标注；应用部分主题包时，未提供的部分和字段会保留当前配置。</p><p class="callout">颜色使用十六进制值。数值范围包含边界。包含对象时，其内部必填字段才需要提供。主题包不会应用书签和壁纸图片。</p><h2>完整字段列表</h2>${fieldTableZh(fields)}<h2>可分享的导出文件</h2><p>从 AI 工作台导出主题包时，会省略个人数据以及本地壁纸、视频和字体文件。可移植的自定义 CSS 会保留，引用本地资源的声明会被移除，导出对话框会显示移除数量。对话框也提供排除全部自定义 CSS 的选项。下载的 JSON 文件名根据主题包名称生成。</p><h2>部分主题包如何应用</h2><p>主题数值会与当前主题合并。未提供的表面颜色会从已提供颜色推导；字体字段逐项合并。背景字段会合并。布局字段会合并，断点网格逐项合并，已提供的区域样式表会整体替换旧表。ID 和类型匹配的组件会合并属性；新的组件 ID 会追加。提供的 CSS 会替换并启用自定义 CSS。提供的变量会替换变量声明；只有来自同名主题包的兼容值会保留。请参阅<a href="design-with-ai.html">AI 工作流程</a>，先预览再应用。</p>`)

  const layersFile = readFileSync(resolve('src/styles/layers.css'), 'utf8')
  const layersMatch = /@layer\s+([^;{}]+);/.exec(layersFile)
  if (!layersMatch) throw new Error('Could not read built-in CSS layer order from src/styles/layers.css')
  const tables = cssTables(layersMatch[1].split(',').map(name => name.trim()))
  const css = page('CSS API reference | Promptab', 'CSS API 参考 | Promptab', 'Generated reference for Promptab public CSS selectors, tokens, and sanitizer rules.',
    `<p class="eyebrow">Generated reference · API v${CSS_API_VERSION}</p><h1>CSS API v${CSS_API_VERSION}</h1><p class="lead">Only the selectors listed here are stable for custom CSS. The <code>mnt</code> prefix is part of the public API; renaming a listed class or token is a breaking change.</p><h2>Public classes</h2><div class="table-wrap"><table><thead><tr><th>Class</th><th>Meaning</th></tr></thead><tbody>${tables.classEn}</tbody></table></div><h2>Public attribute selectors</h2><div class="table-wrap"><table><thead><tr><th>Selector</th><th>Meaning</th></tr></thead><tbody>${tables.attrEn}</tbody></table></div><h2>Readable tokens</h2><p>These variables are provided by the active theme. Set colors through the theme controls; treat the public variables as read-only values.</p><div class="table-wrap"><table><thead><tr><th>Token</th><th>Group</th><th>Use</th></tr></thead><tbody>${tables.tokenEn}</tbody></table></div><h2>Cascade layers</h2><p>The built-in order is ${tables.layers}. User CSS is wrapped in <code>@layer user</code>, so ordinary user declarations come after the built-in layers. The earlier guard layer uses important declarations to keep the settings entry and banners usable.</p><h2>Sanitizer rules</h2><p>Valid CSS is parsed, comments are removed, and the result is normalized before it is injected. Invalid CSS is rejected as a whole and is not injected. Limits are <strong>${MAX_CSS_BYTES.toLocaleString('en-US')} bytes</strong> and <strong>${MAX_CSS_RULES.toLocaleString('en-US')} rules</strong>.</p><ul><li>Allowed at-rules: ${tables.allowedAt}. Other at-rules, including <code>@import</code>, are rejected.</li><li>Rejected properties: ${tables.forbiddenProps}. Rejected functions: ${tables.forbiddenFunctions}. External or unrecognized URLs are rejected; accepted references are local <code>mnt-asset:</code> assets, <code>data:image/</code> values, and fragment references. In <code>@font-face</code>, only local <code>mnt-asset:</code> font files are accepted. URL-bearing string functions checked include ${tables.urlFunctions}.</li><li>Unbalanced syntax, parser errors, escaped names, disallowed raw values, and rule-limit violations block the stylesheet.</li><li><code>!important</code> is parsed but discouraged: it can make later theme adjustments ineffective. The AI workbench reports it as a warning.</li></ul><p>The guard layer protects the settings entry and banners. If custom CSS makes the settings entry unreachable, the reach check removes the CSS so you can recover.</p><h2>Safe mode</h2><p>Open the page with <code>#safe</code> in the URL or press Escape three times quickly. Safe mode pauses custom CSS but leaves the editor available. Turn safe mode off from its banner after fixing or removing the problematic rules.</p><h2>Example CSS</h2><p>This example uses only public selectors and theme variables. <a href="examples/clock-and-links.css">Open the CSS source file</a>.</p><pre tabindex="0"><code data-example-src="examples/clock-and-links.css">Loading example…</code></pre>`,
    `<p class="eyebrow">自动生成的参考 · API v${CSS_API_VERSION}</p><h1>CSS API v${CSS_API_VERSION}</h1><p class="lead">只有下列选择器适用于稳定的自定义 CSS。<code>mnt</code> 前缀属于公开 API；重命名此处列出的类或变量属于破坏性更改。</p><h2>公开类</h2><div class="table-wrap"><table><thead><tr><th>类</th><th>说明</th></tr></thead><tbody>${tables.classZh}</tbody></table></div><h2>公开属性选择器</h2><div class="table-wrap"><table><thead><tr><th>选择器</th><th>说明</th></tr></thead><tbody>${tables.attrZh}</tbody></table></div><h2>可读取的变量</h2><p>这些变量由当前主题提供。请通过主题设置修改颜色；公开变量仅供读取。</p><div class="table-wrap"><table><thead><tr><th>变量</th><th>类别</th><th>用途</th></tr></thead><tbody>${tables.tokenZh}</tbody></table></div><h2>层叠层级</h2><p>内置层级顺序为 ${tables.layers}。用户 CSS 会包裹在 <code>@layer user</code> 中，因此普通用户声明位于内置层之后。更早的 guard 保护层使用 important 声明，确保设置入口和横幅可用。</p><h2>清理规则</h2><p>有效 CSS 会经过解析、移除注释并规范化后再注入。无效 CSS 会整体拒绝，不会注入。限制为 <strong>${MAX_CSS_BYTES.toLocaleString('en-US')} 字节</strong>和 <strong>${MAX_CSS_RULES.toLocaleString('en-US')} 条规则</strong>。</p><ul><li>允许的 at-rule：${tables.allowedAt}。其他 at-rule（包括 <code>@import</code>）都会拒绝。</li><li>拒绝的属性：${tables.forbiddenProps}。拒绝的函数：${tables.forbiddenFunctions}。外部或无法识别的网址会被拒绝；允许本地 <code>mnt-asset:</code> 资源、<code>data:image/</code> 值和片段引用。在 <code>@font-face</code> 中只允许本地 <code>mnt-asset:</code> 字体文件。会检查的 URL 字符串函数包括 ${tables.urlFunctions}。</li><li>不平衡语法、解析器错误、转义名称、不允许的原始值以及超出规则数量上限都会阻止样式表加载。</li><li>解析器允许 <code>!important</code>，但不建议使用：它可能阻碍后续主题调整。AI 工作台会对此发出警告。</li></ul><p>保护层确保设置入口和横幅保持可用。如果自定义 CSS 让设置入口无法访问，可达性检查会移除整份 CSS，方便你恢复。</p><h2>安全模式</h2><p>在网址后加 <code>#safe</code>，或快速连续按三次 Escape。安全模式会暂停自定义 CSS，但编辑器仍可使用。修复或移除问题规则后，可在安全模式横幅中退出。</p><h2>CSS 示例</h2><p>此示例只使用公开选择器和主题变量。<a href="examples/clock-and-links.css">打开 CSS 源文件</a>。</p><pre tabindex="0"><code data-example-src="examples/clock-and-links.css">正在加载示例…</code></pre>`)
  return { 'theme-pack.html': pack, 'css-api.html': css }
}

const expected = buildPages()
let stale = false
for (const [file, content] of Object.entries(expected)) {
  const path = resolve(outDir, file)
  const current = readFileSync(path, 'utf8').replace(/\r\n/g, '\n')
  if (current === content.replace(/\r\n/g, '\n')) continue
  if (process.argv.includes('--check')) {
    console.error(`${path} is stale; run npx vite-node scripts/gen-public-docs.ts`)
    stale = true
  } else {
    writeFileSync(path, content)
    console.log(`wrote docs/docs/${file}`)
  }
}
if (process.argv.includes('--check') && stale) process.exitCode = 1
