# Promptab 0.17.0 商店发布材料

## What's new — English

- Moving from nightTab is now complete: besides bookmarks and the theme, a nightTab backup brings its clock and date formats, greeting, search engine (including custom engines), layout alignment and size, page title, bookmark style and link options, and random or cycling accent colours.
- nightTab bookmarks that used brand icons (GitHub, YouTube and others) no longer appear blank; they show the site's own icon.
- Anything that cannot be imported, such as web wallpapers or saved nightTab themes, is listed after the import.
- New: set your own tab title in Settings → About.
- New: Websites → Show the address on hover shows each site's address under it.
- No new permissions are requested.

## 更新内容 — 简体中文

- 从 nightTab 迁移更完整：除了书签和主题，还会导入时钟和日期格式、问候语、搜索引擎（含自定义引擎）、布局对齐和缩放、页面标题、书签样式与打开方式，以及随机或循环强调色。
- 使用品牌图标（GitHub、YouTube 等）的 nightTab 书签不再显示为空白，改为显示网站自己的图标。
- 无法导入的内容（例如网络壁纸、nightTab 保存的主题）会在导入后列出。
- 新增：在「设置 → 关于」里自定义标签页标题。
- 新增：「网站 → 悬停时显示网址」，鼠标悬停时在网站下方显示网址。
- 未新增任何权限。

## Notes for certification

```text
Promptab replaces the browser's new tab with a customizable dashboard. No Promptab account or login is required. Core features and manual AI copy/paste require no API key. Optional direct AI requests use a key supplied for that session and require the user's own Anthropic or OpenAI key; provider charges may apply.

To test 0.17.0, open a new tab and open Settings. In About, type a Tab title: the browser tab text changes immediately and stays after reloading; clearing the field restores the default title. In Websites, turn on "Show the address on hover", close Settings and hover a website: its address appears below it. In Backup & import, choose "Import from nightTab" and pick a nightTab JSON backup: after confirming, its bookmarks are added as a group and its clock, date, search and layout settings are applied; Undo restores the previous setup. Brand-icon bookmarks show the website icon, and unsupported items are listed as import notes. The import reads only the chosen local file and makes no network request.

Required permissions are storage, unlimitedStorage and Chromium's favicon permission. Optional bookmarks permission is requested only when the user chooses browser bookmark folders. Optional host permissions for Anthropic, OpenAI and Open-Meteo are requested only when the corresponding direct AI or weather action is used. No permission is added in this release.

All executable extension code is packaged. Promptab does not fetch or execute remote code. The extension_pages CSP is: script-src 'self'; object-src 'none'; font-src 'self' data: blob:
```

## 精简版 publish_notes

```text
Completes nightTab backup import (clock, date, greeting, search engine, layout, page title, bookmark options, accent behaviour; brand icons no longer blank), adds a custom tab title and an option to show website addresses on hover. Import reads only the chosen local file. No new permissions or data collection. All executable code is packaged. CSP: script-src 'self'; object-src 'none'; font-src 'self' data: blob:
```

## Manifest and permission differences from 0.16.1

The only manifest change is `version`: `0.16.1` → `0.17.0`. Required permissions (`storage`, `unlimitedStorage`, `favicon`), the optional `bookmarks` permission, optional host permissions and the extension pages CSP are unchanged. No runtime dependency was added.

## Privacy

No data-use change. The tab title is stored with the rest of the local profile. The nightTab import reads a file the user picks and does not download the web wallpapers or bookmark images it references. Listing and privacy policy text are unchanged.

## Startup

Startup JavaScript with the 0.17.0 build: **476,575 bytes raw** (gzip 151,488), under the unchanged 480,000-byte budget (+759 bytes over 0.16.1).

## Store text that must be pasted by hand

Partner Center description, screenshots and the "What's new" text above are not updated by the publish workflow; paste them in Partner Center if desired.
