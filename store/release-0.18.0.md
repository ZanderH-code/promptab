# Promptab 0.18.0 商店发布材料

0.17.0 was merged but its Edge submission was refused with `InProgressSubmission`, so the store goes from 0.16.1 to 0.18.0. The notes below cover both releases.

## What's new — English

- Moving from nightTab is now complete: a nightTab backup brings its bookmarks, theme, clock and date formats, greeting, search engine (including custom engines), layout, page title and bookmark options. Brand-icon bookmarks show the site's own icon, and anything that cannot be imported is listed.
- New: set your own tab title in Settings → About, and show each website's address on hover (Settings → Websites).
- Adding a website is smoother: the dialog says "Add website", the cursor starts in the address field, and Escape closes it.
- Edit mode is easier to read: the edit, move, delete and drag buttons sit under each website instead of covering its icon, and "Add group" in the toolbar works directly.
- The welcome card can be dismissed and no longer pushes your websites off the first screen.
- Settings are tidier: website options live under Websites, keyboard shortcuts under About, scale shows as a percentage, and the same word, "websites", is used everywhere.
- No new permissions are requested.

## 更新内容 — 简体中文

- 从 nightTab 迁移更完整：nightTab 备份会带来书签、主题、时钟和日期格式、问候语、搜索引擎（含自定义引擎）、布局、页面标题和书签选项；品牌图标书签显示网站自己的图标，无法导入的内容会列出。
- 新增：在「设置 → 关于」自定义标签页标题；在「设置 → 网站」开启悬停显示网址。
- 添加网站更顺手：对话框标题为「添加网站」，光标直接在网址框，按 Esc 即可关闭。
- 编辑模式更清晰：编辑、移动、删除和拖动按钮放在网站下方，不再盖住图标；工具栏的「添加分组」可直接使用。
- 欢迎卡片可以关闭，也不再把网站挤出首屏。
- 设置更整齐：网站相关选项归到「网站」，键盘快捷键归到「关于」，缩放以百分比显示，统一称为「网站」。
- 未新增任何权限。

## Notes for certification

```text
Promptab replaces the browser's new tab with a customizable dashboard. No Promptab account or login is required. Core features and manual AI copy/paste require no API key. Optional direct AI requests use a key supplied for that session and require the user's own Anthropic or OpenAI key; provider charges may apply.

To test 0.18.0, open a new tab. Click "Add website" under the websites: the dialog opens with the cursor in the address field; type github.com and press Enter to save, or press Escape to close. Press E (or Settings → Edit desktop) to enter edit mode: each website shows edit, move, delete and drag buttons under its name; "Add group" in the top toolbar asks for a group name. In Settings → About, type a Tab title: the browser tab text changes and stays after reloading. In Settings → Websites, turn on "Show the address on hover" and hover a website to see its address. In Settings → Backup & import, "Import from nightTab" reads a nightTab JSON backup chosen by the user and adds its bookmarks and settings; Undo restores the previous setup. The import reads only the chosen local file and makes no network request.

Required permissions are storage, unlimitedStorage and Chromium's favicon permission. Optional bookmarks permission is requested only when the user chooses browser bookmark folders. Optional host permissions for Anthropic, OpenAI and Open-Meteo are requested only when the corresponding direct AI or weather action is used. No permission is added in this release.

All executable extension code is packaged. Promptab does not fetch or execute remote code. The extension_pages CSP is: script-src 'self'; object-src 'none'; font-src 'self' data: blob:
```

## 精简版 publish_notes

```text
Usability fixes (add-website dialog focus and Escape, readable edit mode, dismissible welcome card, tidier settings) plus the 0.17 changes: complete nightTab backup import, custom tab title, website addresses on hover. Import reads only the chosen local file. No new permissions or data collection. All executable code is packaged. CSP: script-src 'self'; object-src 'none'; font-src 'self' data: blob:
```

## Manifest and permission differences from 0.16.1 (last store version)

The only manifest change is `version`: `0.16.1` → `0.18.0`. Required permissions (`storage`, `unlimitedStorage`, `favicon`), the optional `bookmarks` permission, optional host permissions and the extension pages CSP are unchanged. No runtime dependency was added.

## Privacy

No data-use change. The tab title is stored with the rest of the local profile. The nightTab import reads a file the user picks and does not download the web wallpapers or bookmark images it references. Listing and privacy policy text are unchanged.

## Startup

Startup JavaScript with the 0.18.0 build: **476,971 bytes raw** (gzip 151,617), under the unchanged 480,000-byte budget.

## Store text that must be pasted by hand

Partner Center description, screenshots and the "What's new" text above are not updated by the publish workflow; paste them in Partner Center if desired.
