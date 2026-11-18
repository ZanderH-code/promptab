# Promptab 0.20.0 商店发布材料

0.19.0 is live in Edge Add-ons. 0.20.0 is a usability pass over the other widgets and small features.

## What's new — English

- Typing in settings and notes no longer loses characters, including with Chinese input methods.
- Todo list on the page: add with Enter, tick, delete and clear completed tasks.
- Countdowns follow your local date and say "Tomorrow" / "Yesterday".
- Widget settings: one card per widget, move up/down, greeting name and spacer height.
- Group dialogs are clearer, and moving a website can create a new group.
- Search: Ctrl/⌘ + Enter or a middle click opens results in a new tab.
- Escape closes Settings; page shortcuts pause while a dialog is open.
- No new permissions.

## 更新内容 — 简体中文

- 在设置和便签里打字不再丢字，中文输入法也正常。
- 待办清单可以直接在页面上添加（回车）、勾选、删除和清除已完成。
- 倒数日按本地日期计算，显示「明天」「昨天」。
- 组件设置：每个组件一张卡片，可上下移动，可设置问候称呼和间隔高度。
- 分组对话框更清楚，移动网站时可以直接新建分组。
- 搜索：Ctrl/⌘ + 回车或鼠标中键在新标签页打开结果。
- Esc 可关闭设置；对话框打开时页面快捷键暂停。
- 未新增任何权限。

## Notes for certification

```text
Promptab replaces the browser's new tab with a customizable dashboard. No Promptab account or login is required. Core features and manual AI copy/paste require no API key. Optional direct AI requests use a key supplied for that session and require the user's own Anthropic or OpenAI key; provider charges may apply.

To test 0.20.0, open a new tab, open Settings → Widgets and click "Todo list". Close Settings, type a task into "Add a task" on the page and press Enter; tick it and click "Clear completed". Add a "Note" widget and type into it; the text stays after reopening the tab. In edit mode (press E), use "Add group": an empty name shows a message, and Escape closes the dialog.

Required permissions are storage, unlimitedStorage and Chromium's favicon permission. Optional bookmarks permission is requested only when the user chooses browser bookmark folders. Optional host permissions for Anthropic, OpenAI and Open-Meteo are requested only when the corresponding direct AI or weather action is used. No permission is added in this release.

All executable extension code is packaged. Promptab does not fetch or execute remote code. The extension_pages CSP is: script-src 'self'; object-src 'none'; font-src 'self' data: blob:
```

## 精简版 publish_notes

```text
Usability fixes for widgets and dialogs: no dropped keystrokes in text fields, on-page todo list, local-date countdowns, clearer group dialogs, search new-tab shortcuts. No new permissions, no data-use change. All executable code is packaged. CSP: script-src 'self'; object-src 'none'; font-src 'self' data: blob:
```

## Manifest and permission differences from 0.19.0

The only manifest change is `version`: `0.19.0` → `0.20.0`. Permissions, optional permissions, optional host permissions and CSP are unchanged.

## Privacy

Unchanged. No new data is collected or sent; the privacy policy is not modified.

## Startup

Startup JavaScript: **479,217 bytes raw** (gzip 152,358), under the unchanged 480,000-byte budget.

## Store text that must be pasted by hand

Partner Center description, screenshots and the "What's new" text above are not updated by the publish workflow; paste them in Partner Center if desired.
