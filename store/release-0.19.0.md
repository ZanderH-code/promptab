# Promptab 0.19.0 商店发布材料

0.18.0 is live in Edge Add-ons. 0.19.0 fixes the weather widget.

## What's new — English

- Weather works by itself: pick a city once and every new tab shows its forecast, starting with the last saved one while it updates.
- City search lists matching places as you type, with region and country so same-named cities are easy to tell apart. Arrow keys and Enter work.
- Clearer location messages: Promptab says whether location was blocked, unavailable or too slow, and suggests searching for your city.
- An empty weather card has a "Choose city" button; refresh is now a small icon.
- Edit mode: widget outlines no longer overlap.
- No new permissions.

## 更新内容 — 简体中文

- 天气可以自动显示了：选一次城市，之后每次打开新标签页都会显示天气，先展示上次保存的结果再在后台更新。
- 输入城市时实时显示候选列表，带省份和国家，同名城市一眼能分清；支持方向键和回车。
- 定位提示更清楚：会说明是被浏览器拒绝、设备无法定位还是超时，并建议直接搜索城市。
- 空的天气卡片有「选择城市」按钮；刷新改为小图标。
- 编辑模式下组件的虚线框不再重叠。
- 未新增任何权限。

## Notes for certification

```text
Promptab replaces the browser's new tab with a customizable dashboard. No Promptab account or login is required. Core features and manual AI copy/paste require no API key. Optional direct AI requests use a key supplied for that session and require the user's own Anthropic or OpenAI key; provider charges may apply.

To test 0.19.0, open a new tab, open Settings → Widgets and click "Weather". Type "London" in the City field: matching cities appear in a list while typing (the first search asks once for access to the two Open-Meteo hosts, which are optional host permissions already declared). Choose a result and close Settings: the weather card shows the forecast without pressing anything, and a new tab shows it again immediately. "Use current location" asks for the browser's location once and then loads that forecast.

Required permissions are storage, unlimitedStorage and Chromium's favicon permission. Optional bookmarks permission is requested only when the user chooses browser bookmark folders. Optional host permissions for Anthropic, OpenAI and Open-Meteo are requested only when the corresponding direct AI or weather action is used. No permission is added in this release.

All executable extension code is packaged. Promptab does not fetch or execute remote code. The extension_pages CSP is: script-src 'self'; object-src 'none'; font-src 'self' data: blob:
```

## 精简版 publish_notes

```text
Weather widget fixes: live city search results, forecast loads automatically after a city is chosen (cached 30 minutes), clearer location errors. Uses the already-declared optional Open-Meteo host permissions; no new permissions. Privacy policy updated to describe the automatic forecast load. All executable code is packaged. CSP: script-src 'self'; object-src 'none'; font-src 'self' data: blob:
```

## Manifest and permission differences from 0.18.0

The only manifest change is `version`: `0.18.0` → `0.19.0`. Permissions, optional permissions, optional host permissions and CSP are unchanged.

## Privacy

Data use changed slightly: after the user picks a weather city or location, each new tab sends the saved coordinates to `api.open-meteo.com` (at most about every 30 minutes thanks to the local cache) instead of only on a button press. City search sends the typed text to `geocoding-api.open-meteo.com` while typing, after the user grants access. The privacy policy (store/privacy-policy.md and the public privacy page) is updated accordingly. Removing the widget stops all weather requests.

## Startup

Startup JavaScript: **477,017 bytes raw** (gzip 151,639), under the unchanged 480,000-byte budget.

## Store text that must be pasted by hand

Partner Center description, screenshots and the "What's new" text above are not updated by the publish workflow; paste them in Partner Center if desired. The privacy policy URL is unchanged; its content is updated when GitHub Pages deploys.
