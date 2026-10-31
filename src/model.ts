export type Shortcut = { id: string; name: string; url: string; color: string; icon: string; image?: string; iconMode?: 'auto' | 'text' }
export type Settings = { schemaVersion: 1; language: 'zh-CN' | 'en'; theme: 'dark' | 'light'; accent: string; background: string; showClock: boolean; showDate: boolean; showSearch: boolean; hour12: boolean; searchTemplate: string; shortcuts: Shortcut[]; columns: number; iconSize: number; iconShape: 'circle' | 'rounded' | 'square'; alignment: 'left' | 'center'; layout: 'stacked' | 'split'; reverse: boolean; wallpaper?: string; overlay: number }
export const defaults: Settings = { schemaVersion: 1, language: 'zh-CN', theme: 'dark', accent: '#90d5cd', background: '#102932', showClock: true, showDate: true, showSearch: true, hour12: false, searchTemplate: 'https://www.google.com/search?q={query}', shortcuts: [{id:'example',name:'示例网站',url:'https://example.com',color:'#90d5cd',icon:'例'}], columns: 6, iconSize: 72, iconShape: 'circle', alignment: 'center', layout: 'stacked', reverse: false, overlay: 35 }
export function isHttpUrl(value: string) { try { return ['http:', 'https:'].includes(new URL(value).protocol) } catch { return false } }
export function searchUrl(template: string, input: string) { if (!input.trim()) return null; if (!template.includes('{query}') || !isHttpUrl(template.replaceAll('{query}', 'test'))) throw new Error('请输入有效的搜索地址，并包含 {query}'); return template.replaceAll('{query}', encodeURIComponent(input.trim())) }
export function validate(value: unknown): Settings {
  if (!value || typeof value !== 'object') throw new Error('配置格式无效')
  const v = { ...defaults, ...value } as Settings
  if (!['zh-CN','en'].includes(v.language)) throw new Error('语言设置无效')
  if (!['stacked','split'].includes(v.layout) || typeof v.reverse !== 'boolean') throw new Error('布局配置无效')
  if (!Number.isInteger(v.columns) || v.columns < 2 || v.columns > 10 || !Number.isInteger(v.iconSize) || v.iconSize < 40 || v.iconSize > 120 || !['circle','rounded','square'].includes(v.iconShape) || !['left','center'].includes(v.alignment) || typeof v.overlay !== 'number' || v.overlay < 0 || v.overlay > 80 || (v.wallpaper !== undefined && (typeof v.wallpaper !== 'string' || !/^data:image\/(png|jpeg|webp);base64,/.test(v.wallpaper) || v.wallpaper.length > 7000000))) throw new Error('布局配置无效')
  if (v.schemaVersion !== 1 || !['dark','light'].includes(v.theme) || !/^#[\da-f]{6}$/i.test(v.accent) || !/^#[\da-f]{6}$/i.test(v.background) || !['showClock','showDate','showSearch','hour12'].every(k => typeof v[k as keyof Settings] === 'boolean') || typeof v.searchTemplate !== 'string' || !Array.isArray(v.shortcuts)) throw new Error('配置格式或版本无效')
  searchUrl(v.searchTemplate, 'test')
  const ids = new Set<string>()
  for (const s of v.shortcuts) { if (!s || typeof s.id !== 'string' || !s.id || ids.has(s.id) || typeof s.name !== 'string' || !s.name.trim() || typeof s.icon !== 'string' || !s.icon.trim() || typeof s.color !== 'string' || !/^#[\da-f]{6}$/i.test(s.color) || typeof s.url !== 'string' || !isHttpUrl(s.url) || (s.iconMode !== undefined && !['auto','text'].includes(s.iconMode)) || (s.image !== undefined && (typeof s.image !== 'string' || !/^data:image\/(png|jpeg|webp);base64,/.test(s.image) || s.image.length > 700000))) throw new Error('快捷方式无效'); ids.add(s.id) }
  return v
}
