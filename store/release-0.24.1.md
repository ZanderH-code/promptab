# Promptab 0.24.1 商店发布材料

0.24.0 is live in Edge Add-ons and the Chrome Web Store. 0.24.1 is a maintenance release with fixes and a better-tuned AI assistant.

## What's new — English

- The AI assistant knows every widget option and area style, so generated themes work on the first try more often.
- With "change wallpaper on every new tab", each newly opened tab gets its own image, without briefly showing the first one.
- The safe-mode and AI-preview banners wrap cleanly on narrow screens.
- Restoring a backup checks shortcut tile images more strictly.

## 更新内容 — 简体中文

- AI 助手了解所有组件选项和区域样式，生成的主题更常一次就能用。
- 开启「每次打开新标签页更换壁纸」时，每个新标签页都会显示自己的图片，不会先闪现第一张。
- 安全模式和 AI 预览提示条在窄屏上可以正常换行。
- 恢复备份时会更严格地检查快捷方式磁贴图片。

## Notes for certification

```text
Promptab replaces the browser's new tab with a customizable dashboard. No Promptab account or login is required. Core features and manual AI copy/paste require no API key. Optional direct AI requests use a key supplied for that session and require the user's own Anthropic or OpenAI key; provider charges may apply.

The storage permission saves the user's profiles, settings, shortcuts, theme, undo history and wallpapers (chrome.storage.local) and, when the user turns on Browser Sync, sync data (chrome.storage.sync). To see it: open a new tab, open Settings (gear icon), change the theme, then open a new tab again; the change is kept.

To test 0.24.1: open Settings → Background, choose two or more images and set rotation to "every new tab"; open several new tabs and each shows the next image. Press Esc three times for safe mode on a narrow window; the banner text wraps normally.

Required permissions are storage, unlimitedStorage and Chromium's favicon permission. Optional bookmarks permission is requested only when the user chooses browser bookmark folders. Optional host permissions for Anthropic, OpenAI, Open-Meteo and BigDataCloud are requested only when the corresponding direct AI or weather action is used.

All executable extension code is packaged. Promptab does not fetch or execute remote code. The extension_pages CSP is: script-src 'self'; object-src 'none'; font-src 'self' data: blob:
```

## 精简版 publish_notes

```text
Maintenance: tuned AI prompt, per-tab wallpaper rotation fix, stricter backup tile-image check, mobile banner wrap. No permission, data-use or CSP changes. All executable code is packaged.
```

## Manifest and permission differences from 0.24.0

- `version`: `0.24.0` → `0.24.1`. Permissions, optional permissions and CSP are unchanged. The `identity` permission and `https://www.googleapis.com/*` host for Google Drive sync are added only to builds with `VITE_GOOGLE_DRIVE_CLIENT_ID`; this release is built without it.

## Privacy

No new data use in this package. The privacy policy now also describes the optional Google Drive sync for builds that include it (effective date updated to 2026-11-22).

## Firefox

Firefox has no publish workflow: upload `promptab-firefox-0.24.1.zip` from the GitHub release to addons.mozilla.org by hand.

## Startup

Startup JavaScript: **444,825 bytes raw**, under the unchanged 480,000-byte budget.

## Store text that must be pasted by hand

Partner Center and Chrome developer console descriptions, screenshots and the "What's new" text above are not updated by the publish workflow; paste them by hand if desired.
