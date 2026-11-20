# Promptab 0.23.1 商店发布材料

0.23.0 is live in Edge Add-ons. The Chrome Web Store rejected it on 2026-11-19 with "Requesting but not using: storage" (Purple Potassium). 0.23.1 fixes that, names the weather widget's current location, and brings back browser bookmark import in Chromium.

## What's new — English

- The weather widget shows the name of your current location (for example "Portland, Oregon, United States") instead of "Current location".
- Importing browser bookmark folders is available again in Chrome and Edge.
- Internal fix so store review can see where the storage permission is used.
- New optional permission: `https://api.bigdatacloud.net/*`, asked for only when you use your current location for weather.

## 更新内容 — 简体中文

- 天气组件使用当前位置时，会显示具体地名（例如「上海市, 中国」），不再只显示「当前位置」。
- 在 Chrome 和 Edge 里可以重新导入浏览器书签文件夹。
- 内部修正：让商店审核能识别存储权限的用途。
- 新增可选权限 `https://api.bigdatacloud.net/*`，仅在天气组件使用当前位置时请求。

## Notes for certification

```text
Promptab replaces the browser's new tab with a customizable dashboard. No Promptab account or login is required. Core features and manual AI copy/paste require no API key. Optional direct AI requests use a key supplied for that session and require the user's own Anthropic or OpenAI key; provider charges may apply.

The storage permission saves the user's profiles, settings, shortcuts, theme, undo history and wallpapers (chrome.storage.local) and, when the user turns on Browser Sync, sync data (chrome.storage.sync). To see it: open a new tab, open Settings (gear icon), change the theme, then open a new tab again; the change is kept.

To test 0.23.1: open Settings → Widgets, add Weather, click "Use current location" and allow location. The widget shows the place name (looked up once through BigDataCloud's reverse geocoder) and its forecast from Open-Meteo.

Required permissions are storage, unlimitedStorage and Chromium's favicon permission. Optional bookmarks permission is requested only when the user chooses browser bookmark folders. Optional host permissions for Anthropic, OpenAI, Open-Meteo and BigDataCloud are requested only when the corresponding direct AI or weather action is used.

All executable extension code is packaged. Promptab does not fetch or execute remote code. The extension_pages CSP is: script-src 'self'; object-src 'none'; font-src 'self' data: blob:
```

## 精简版 publish_notes

```text
Weather names the current location (new optional host api.bigdatacloud.net, asked only on "Use current location"); bookmark import back in Chromium; storage referenced directly. Privacy policy updated. All executable code is packaged. CSP: script-src 'self'; object-src 'none'; font-src 'self' data: blob:
```

## Manifest and permission differences from 0.23.0

- `version`: `0.23.0` → `0.23.1`.
- `optional_host_permissions`: added `https://api.bigdatacloud.net/*`. Required permissions and CSP are unchanged.

## Privacy

Updated (`store/privacy-policy.md`, `docs/privacy/index.html`, English and Chinese; `store/listing.md`). When the user clicks "Use current location", the coordinates and display language are sent once to BigDataCloud's free client-side reverse geocoder to name the place; the name is saved with the widget. Nothing is sent to a Promptab server.

## Startup

Startup JavaScript: **443,899 bytes raw**, under the unchanged 480,000-byte budget.

## Store text that must be pasted by hand

Partner Center and Chrome developer console descriptions, screenshots and the "What's new" text above are not updated by the publish workflow; paste them by hand if desired. Chrome: upload the 0.23.1 package from the GitHub release and submit for review.
