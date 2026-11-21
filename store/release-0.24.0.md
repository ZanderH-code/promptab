# Promptab 0.24.0 商店发布材料

0.23.1 is live in Edge Add-ons. 0.24.0 makes the Settings panel easier to work through: everything about one widget is in one place, and the layout tab is about a quarter of its old length.

## What's new — English

- Each widget's position, order, size and alignment are set from that widget's own card under Settings → Widgets, next to its other options.
- Settings → Areas & grid starts with the page-wide controls (alignment, width, spacing, icon size); each area's style options are folded away until you open them.

## 更新内容 — 简体中文

- 每个组件的区域、顺序、大小和对齐，现在都在「设置 → 组件」里该组件自己的卡片中设置，和它的其他选项放在一起。
- 「设置 → 区域与网格」先显示整页的对齐、宽度、间距和图标设置；每个区域的样式选项默认收起，需要时再展开。

## Notes for certification

```text
Promptab replaces the browser's new tab with a customizable dashboard. No Promptab account or login is required. Core features and manual AI copy/paste require no API key. Optional direct AI requests use a key supplied for that session and require the user's own Anthropic or OpenAI key; provider charges may apply.

The storage permission saves the user's profiles, settings, shortcuts, theme, undo history and wallpapers (chrome.storage.local) and, when the user turns on Browser Sync, sync data (chrome.storage.sync). To see it: open a new tab, open Settings (gear icon), change the theme, then open a new tab again; the change is kept.

To test 0.24.0: open Settings → Widgets, expand the Clock card and change "Widget area" or "Widget size"; the clock moves or resizes on the page. Settings → Areas & grid shows the page-wide controls first and one folded "Area style" entry per area.

Required permissions are storage, unlimitedStorage and Chromium's favicon permission. Optional bookmarks permission is requested only when the user chooses browser bookmark folders. Optional host permissions for Anthropic, OpenAI, Open-Meteo and BigDataCloud are requested only when the corresponding direct AI or weather action is used.

All executable extension code is packaged. Promptab does not fetch or execute remote code. The extension_pages CSP is: script-src 'self'; object-src 'none'; font-src 'self' data: blob:
```

## 精简版 publish_notes

```text
Settings flow: widget placement moved into each widget's card; Areas & grid shows page-wide controls first with area styles folded. No permission, data-use or CSP changes. All executable code is packaged.
```

## Manifest and permission differences from 0.23.1

- `version`: `0.23.1` → `0.24.0`. Permissions, optional permissions and CSP are unchanged.

## Privacy

Unchanged. No new data use.

## Startup

Startup JavaScript: **443,899 bytes raw**, under the unchanged 480,000-byte budget.

## Store text that must be pasted by hand

Partner Center and Chrome developer console descriptions, screenshots and the "What's new" text above are not updated by the publish workflow; paste them by hand if desired. Chrome: upload the 0.24.0 package from the GitHub release and submit for review.
