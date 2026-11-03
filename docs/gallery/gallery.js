const translations = {
  en: { title: 'Find your next new tab', intro: 'Explore original themes, copy the prompt, or preview one in the web app.', search: 'Search themes', mode: 'Appearance', layout: 'Layout template', all: 'All', light: 'Light', dark: 'Dark', copy: 'Copy prompt', try: 'Try in web app', docs: 'Docs', copied: 'Prompt copied', copyError: 'Could not copy the prompt', empty: 'No themes match your filters.', error: 'The gallery could not be loaded.' },
  'zh-CN': { title: '找到你的下一款新标签页', intro: '浏览原创主题，复制提示词，或在网页版中预览。', search: '搜索主题', mode: '外观', layout: '布局模板', all: '全部', light: '浅色', dark: '深色', copy: '复制提示词', try: '在网页版试用', docs: '文档', copied: '提示词已复制', copyError: '无法复制提示词', empty: '没有符合条件的主题。', error: '无法加载主题画廊。' },
}
const names = { stacked: ['Stacked', '上下排列'], split: ['Split', '左右分栏'], websites: ['Websites', '网址'], zen: ['Zen', '简洁'], dashboard: ['Dashboard', '仪表盘'], 'top-grid': ['Top grid', '顶部网格'], 'icon-split': ['Icon split', '图标分栏'], banner: ['Banner', '横幅'], custom: ['Custom', '自定义'] }
const $ = id => document.getElementById(id)
let language = localStorage.getItem('promptab_lang') === 'zh-CN' ? 'zh-CN' : 'en'
let entries = []
function template(pack) {
  const areas = pack.layout?.areas?.join('|') || 'overview|bookmarks'
  return ({ 'overview|bookmarks': 'stacked', 'bookmarks overview': 'split', bookmarks: 'websites', overview: 'zen', 'clock date links|search search links': 'dashboard', 'clock clock clock|date search links': 'dashboard', 'clock clock clock|date search links|bookmarks bookmarks bookmarks': 'dashboard', 'overview overview|bookmarks bookmarks': 'top-grid', 'bookmarks divider overview': 'icon-split', 'banner|websites': 'banner', '.|banner|websites': 'banner' })[areas] || 'custom'
}
function element(tag, text, className) { const node = document.createElement(tag); if (text) node.textContent = text; if (className) node.className = className; return node }
function render() {
  const t = translations[language]
  document.documentElement.lang = language
  document.title = language === 'en' ? 'Theme gallery | Promptab' : '主题画廊 | Promptab'
  document.querySelectorAll('[data-text]').forEach(node => { node.textContent = t[node.dataset.text] })
  $('language').textContent = language === 'en' ? '中文' : 'English'
  const layout = $('layout'), selected = layout.value
  layout.replaceChildren(new Option(t.all, ''))
  for (const key of [...new Set(entries.map(item => item.template))].sort()) layout.add(new Option(names[key][language === 'en' ? 0 : 1], key))
  layout.value = selected
  const query = $('search').value.trim().toLocaleLowerCase()
  const visible = entries.filter(item => (!query || [item.name, ...item.tags, item.prompt.en, item.prompt['zh-CN']].join(' ').toLocaleLowerCase().includes(query)) && (!$('mode').value || item.mode === $('mode').value) && (!layout.value || item.template === layout.value))
  $('gallery').replaceChildren()
  $('status').textContent = visible.length ? '' : t.empty
  for (const item of visible) {
    const article = element('article', '', 'card'); article.id = item.id
    const image = element('img'); image.src = `previews/${item.id}.png`; image.alt = ''; image.width = 640; image.height = 400; image.loading = 'lazy'; article.append(image)
    const body = element('div', '', 'body'); body.append(element('h2', item.name), element('p', `${t[item.mode]} · ${names[item.template][language === 'en' ? 0 : 1]} · ${item.tags.join(' · ')}`, 'tags'))
    const palette = element('div', '', 'palette'); palette.setAttribute('aria-hidden', 'true'); for (const color of Object.values(item.colors)) { const swatch = element('span'); swatch.style.backgroundColor = color; palette.append(swatch) }; body.append(palette)
    body.append(element('p', item.prompt[language], 'prompt'))
    const actions = element('div', '', 'actions'); const copy = element('button', t.copy); copy.type = 'button'; copy.addEventListener('click', async () => { try { await navigator.clipboard.writeText(item.prompt[language]); $('status').textContent = translations[language].copied } catch { $('status').textContent = translations[language].copyError } }); actions.append(copy)
    const link = element('a', t.try, 'action primary'); link.href = `../app/#try=${encodeURIComponent(item.id)}`; actions.append(link); body.append(actions); article.append(body); $('gallery').append(article)
  }
}
$('language').addEventListener('click', () => { language = language === 'en' ? 'zh-CN' : 'en'; localStorage.setItem('promptab_lang', language); render() })
for (const id of ['search', 'mode', 'layout']) $(id).addEventListener('input', render)
fetch('index.json').then(response => { if (!response.ok) throw new Error('index'); return response.json() }).then(async index => {
  entries = await Promise.all(index.packs.map(async item => { const response = await fetch(`packs/${encodeURIComponent(item.id)}.json`); if (!response.ok) throw new Error('pack'); return { ...item, template: template(await response.json()) } }))
  render()
  if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView()
}).catch(() => { $('status').textContent = translations[language].error })
