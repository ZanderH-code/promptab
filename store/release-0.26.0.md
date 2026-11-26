# Promptab 0.26.0 商店发布材料

0.25.0 is live in Edge Add-ons and the Chrome Web Store. 0.26.0 improves editing, backups and keyboard use. Permissions are unchanged.

## What's new — English

- Move groups up or down and sort a group A–Z in edit mode.
- Drop a website onto a tile in another group to put it right there.
- The website editor shows a live preview and lets you pick the group.
- Restore a backup by adding its websites to your current ones; drop or paste a backup file.
- Zoom for video wallpapers.
- Keyboard: Space and the arrow keys move tiles, Esc leaves edit mode.
- nightTab import keeps every bookmark and reads older nightTab backups.
- Fixes: no background flash in light mode, readable names on coloured tiles, a clear message when a bookmark search finds nothing.

## 更新内容 — 简体中文

- 编辑模式下可以上移、下移分组，也可以把分组按 A–Z 排序。
- 把网站拖到另一个分组的某个网站上，就会放在那个位置。
- 网站编辑器会实时预览图块，添加网站时可以直接选分组。
- 恢复备份时可以把网站追加到现有网站后面；可以直接拖入或粘贴备份文件。
- 视频壁纸支持缩放。
- 键盘：空格和方向键可以移动图块，Esc 退出编辑模式。
- nightTab 导入不再丢书签，也能读取旧版 nightTab 备份。
- 修复：浅色模式启动不再闪色，彩色图块上的名字清晰可读，书签搜索无结果时有提示。

## Notes for certification

```text
Promptab replaces the browser's new tab with a customizable dashboard. No Promptab account or login is required. Core features and manual AI copy/paste require no API key. Optional direct AI requests use a key supplied for that session and require the user's own Anthropic or OpenAI key; provider charges may apply.

The storage permission saves the user's profiles, settings, shortcuts, theme, undo history and wallpapers (chrome.storage.local) and, when the user turns on Browser Sync, sync data (chrome.storage.sync). To see it: open a new tab, open Settings (gear icon), change the theme, then open a new tab again; the change is kept.

The identity permission is used only by chrome.identity.launchWebAuthFlow to open Google's sign-in page when the user turns on Google Drive sync (scopes openid and drive.appdata only).

0.26.0 changes no permissions. To test it: open a new tab, press E for edit mode, use the arrow buttons on a group header to move the group, then press Esc to leave edit mode. Open Settings → Backup & import to drop or paste a backup file.

Required permissions are storage, unlimitedStorage, identity and Chromium's favicon permission. Optional bookmarks permission is requested only when the user chooses browser bookmark folders. Optional host permissions for Anthropic, OpenAI, Open-Meteo, BigDataCloud and www.googleapis.com are requested only when the corresponding direct AI, weather or Google Drive action is used.

All executable extension code is packaged. Promptab does not fetch or execute remote code. The extension_pages CSP is: script-src 'self'; object-src 'none'; font-src 'self' data: blob:
```

## 精简版 publish_notes

```text
Editing, backup and keyboard improvements. No permission changes. All executable code is packaged.
```

## Manifest and permission differences from 0.25.0

- `version`: `0.25.0` → `0.26.0`. Nothing else changes.

## Privacy

Data use is unchanged. Backup paste reads only what the user pastes into the drop box; no clipboard permission is used.

## Firefox

Firefox has no publish workflow: upload `promptab-firefox-0.26.0.zip` from the GitHub release to addons.mozilla.org by hand.

## Startup

Startup JavaScript: **446,132 bytes raw** (Linux build), under the unchanged 480,000-byte budget.

## Store text that must be pasted by hand

Partner Center and Chrome developer console descriptions, screenshots and the "What's new" text above are not updated by the publish workflow; paste them by hand if desired.
