# Promptab 0.22.0 商店发布材料

0.21.0 is live in Edge Add-ons. 0.22.0 lets a nightTab backup reproduce its look, and keeps everything adjustable afterwards.

## What's new — English

- Import a nightTab backup and get its look: layout width, padding and gutter, header items in order with their sizes, clock and date with accent separators, the search field, joined toolbar buttons, groups as headed sections with "Open all", website blocks with wide and tall tiles, their own colours, images and borders, the accent line and hover effects.
- The imported look stays editable: colours, corner radius, shadow, fonts, Interface scale, each widget's size and the background still work, and nightTab's own values appear as "nightTab" options under Theme.
- Website editor: "Tile look" now sets border, icon and name layout, hidden name or icon, icon and name size, spacing, rotation and offset.
- New looks: website blocks, headed sections, time in words, buttons on a plate, corner toolbar, accent tint over a wallpaper, video opacity and vignette.
- Font Awesome icons from nightTab are bundled (Font Awesome Free, CC BY 4.0).
- No new permissions.

## 更新内容 — 简体中文

- 导入 nightTab 备份即可还原它的外观：布局宽度、内边距与间距、页头各项的顺序和大小、带强调色分隔符的时间日期、搜索框、连在一起的工具栏按钮、带标题和「全部打开」的分组、宽/高方块网站及其各自的颜色、图片、边框、强调线和悬停效果。
- 导入后仍可随意调整：颜色、圆角、阴影、字体、界面缩放、每个组件的大小和背景设置都照常生效；nightTab 特有的数值出现在「主题」下的「nightTab」选项里。
- 网站编辑器的「方块外观」新增边框、图标与名称排列、隐藏名称或图标、图标与名称大小、间距、旋转和偏移。
- 新外观：方块网站、带标题分组、文字时间、按钮底板、角落工具栏、壁纸强调色叠加、视频不透明度与暗角。
- nightTab 中的 Font Awesome 图标已内置（Font Awesome Free，CC BY 4.0）。
- 未新增任何权限。

## Notes for certification

```text
Promptab replaces the browser's new tab with a customizable dashboard. No Promptab account or login is required. Core features and manual AI copy/paste require no API key. Optional direct AI requests use a key supplied for that session and require the user's own Anthropic or OpenAI key; provider charges may apply.

To test 0.22.0, open a new tab, open Settings → Backup & import → "Choose nightTab backup" and pick any nightTab 7 JSON export: the page takes on its layout and the import notes list fonts and media to add. Then open Settings → Theme: the "nightTab" options change the layout width and accent line live. Right-click a website → Edit website → Tile look to change its border, spacing or rotation.

Required permissions are storage, unlimitedStorage and Chromium's favicon permission. Optional bookmarks permission is requested only when the user chooses browser bookmark folders. Optional host permissions for Anthropic, OpenAI and Open-Meteo are requested only when the corresponding direct AI or weather action is used. No permission is added in this release.

All executable extension code is packaged. Promptab does not fetch or execute remote code. Imported fonts and media are added by the user from local files; nothing is downloaded. The extension_pages CSP is: script-src 'self'; object-src 'none'; font-src 'self' data: blob:
```

## 精简版 publish_notes

```text
nightTab import reproduces its look and stays editable; new tile, section, toolbar and wallpaper options. No new permissions, no data-use change. All executable code is packaged. CSP: script-src 'self'; object-src 'none'; font-src 'self' data: blob:
```

## Manifest and permission differences from 0.21.0

The only manifest change is `version`: `0.21.0` → `0.22.0`. Permissions, optional permissions, optional host permissions and CSP are unchanged.

## Privacy

Unchanged. No new data is collected or sent; the privacy policy is not modified. A nightTab backup is read locally.

## Startup

Startup JavaScript: **449,176 bytes raw**, under the unchanged 480,000-byte budget.

## Store text that must be pasted by hand

Partner Center description, screenshots and the "What's new" text above are not updated by the publish workflow; paste them in Partner Center if desired.
