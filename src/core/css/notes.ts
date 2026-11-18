import type { CSS_API_CLASSES } from './api'

type Note = { en: string; zh: string }
const websites = (style: string, zh: string): Note => ({
  en: `The whole websites widget when it uses the ${style} style, not one website (that is \`.mnt-link\` / \`.mnt-link-icon\`). Transparent by default: a border, background or shadow here draws one big box around every website.`,
  zh: `「${zh}」样式下的整个网站区组件，不是单个网站（单个网站是 .mnt-link / .mnt-link-icon）。默认透明：在这里加边框、背景或阴影，会把所有网站框成一个大方块。`,
})

/**
 * What each public class is and how it already looks, in both languages. One source for the AI prompt,
 * the CSS editor's completions and the generated docs. AI themes went wrong mostly where a name was
 * read literally (`tile`, `input`), so the notes say what the element is and what not to add to it.
 */
export const CLASS_NOTES: Record<(typeof CSS_API_CLASSES)[number], Note> = {
  'mnt-root': { en: 'The page root. Theme variables and the background live here.', zh: '页面根容器；主题变量和背景在这里。' },
  'mnt-header': { en: 'The top bar with the settings button. Protected.', zh: '顶部栏，放着设置按钮；受保护。' },
  'mnt-settings-entry': { en: 'The settings button. Protected: custom CSS cannot hide, move or cover it.', zh: '设置按钮；受保护，CSS 无法隐藏、移动或遮挡它。' },
  'mnt-layout': { en: 'The responsive layout grid; carries template, breakpoint and edit-mode attributes.', zh: '响应式布局网格，带模板、断点和编辑模式属性。' },
  'mnt-area': { en: 'One named layout area. Carries `data-area` with its area name. Transparent by default.', zh: '一个具名布局区域，带 data-area；默认透明。' },
  'mnt-widget': { en: 'Every widget block. Combine with `data-widget` to pick one.', zh: '每个组件块；配合 data-widget 选中某一种组件。' },
  'mnt-widget-frame': { en: 'The same element as `.mnt-widget`: the transparent frame around one widget, carrying its type and ID.', zh: '与 .mnt-widget 是同一元素：组件外层的透明框，带组件类型和 ID。' },
  'mnt-widget-toolbar': { en: 'The toolbar widget action container.', zh: '工具栏组件的按钮区。' },
  'mnt-bookmark-tile': websites('tile', '平铺'),
  'mnt-bookmark-list': websites('list', '列表'),
  'mnt-bookmark-minimal': websites('minimal', '简约'),
  'mnt-bookmark-card': websites('card', '卡片'),
  'mnt-bookmark-icon-only': websites('icon-only', '仅图标'),
  'mnt-clock': { en: 'The large time text, set in `theme.font.display`.', zh: '大号时间文字，使用 theme.font.display 字体。' },
  'mnt-date': { en: 'The date line under the clock, written in the interface language (Chinese text in a Chinese interface), so wide letter-spacing and uppercase do not suit it.', zh: '时钟下方的日期，随界面语言显示（中文界面就是中文），不适合大字距和大写。' },
  'mnt-search': { en: 'The search bar: a wide rounded pill with a hairline border, a surface background, a search icon, a `/` key hint and a submit arrow. Style the bar’s border, background, radius and shadow here; use `:focus-within` for its focused look.', zh: '搜索栏：宽幅圆角胶囊，带细边框、表面底色、搜索图标、/ 快捷键提示和提交箭头。边框、背景、圆角、阴影写在这里；聚焦样式用 :focus-within。' },
  'mnt-search-input': { en: 'The bare text field inside the search bar, transparent and borderless on purpose. Change only font, colour or caret-color here: a border, background or shadow draws a second box inside the bar.', zh: '搜索栏里的纯文本输入框，刻意透明无边框。这里只改字体、颜色或 caret-color：加边框、背景或阴影会在搜索栏里再画出一个框。' },
  'mnt-group': { en: 'The same element as `.mnt-bookmark-<style>`: the whole websites widget with all of its groups, not one group.', zh: '与 .mnt-bookmark-<样式> 是同一元素：整个网站区（包含所有分组），不是单个分组。' },
  'mnt-group-title': { en: 'The heading row above a group of websites: a small muted label, a hairline rule filling the row and a count. It already has its rule, so do not add borders.', zh: '每组网站上方的标题行：小号浅色标签、一条贯穿整行的细线和数量。已经自带细线，不要再加边框。' },
  'mnt-group-title-hidden': { en: 'A group title whose text is hidden visually but kept for screen readers.', zh: '视觉上隐藏、但仍保留给读屏软件的分组标题。' },
  'mnt-link': { en: 'One website: its icon tile with the name below. Carries `data-link-host` with the site host.', zh: '单个网站：图标块加下方名称，带 data-link-host（网站域名）。' },
  'mnt-link-icon': { en: 'A website’s icon tile, tinted with the site’s brand colour. Its shape and size come from `theme.iconShape` and `theme.iconSize`.', zh: '网站的图标块，用网站品牌色着色；形状和大小来自 theme.iconShape 和 theme.iconSize。' },
  'mnt-link-name': { en: 'The website name under its icon.', zh: '图标下方的网站名称。' },
  'mnt-folder': { en: 'A bookmark folder entry in the websites grid.', zh: '网站区里的书签文件夹入口。' },
  'mnt-folder-preview': { en: 'The folder entry’s miniature icon preview.', zh: '文件夹入口里的小图标预览。' },
  'mnt-folder-name': { en: 'The folder entry’s name.', zh: '文件夹入口的名称。' },
  'mnt-folder-dialog': { en: 'The open folder dialog containing its websites.', zh: '打开后的文件夹对话框。' },
  'mnt-folder-backdrop': { en: 'The full-viewport overlay behind an open folder dialog.', zh: '文件夹对话框背后的全屏遮罩。' },
}
