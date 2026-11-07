# Promptab 0.12.3 商店发布材料

## What's new — English

- Website icons are cached for real: a second new tab paints cached icons, letters, or brand marks on the first frame and does not re-probe sites.
- Cached icons stay visible while being refreshed after 7 days, and entries are dropped after 30 days.
- Failed lookups back off for 1 hour, then 6 hours, then 24 hours.
- The cache moves to localStorage `mnt.iconCache:v3`, merges entries across tabs, and has room for 1024 sites.
- Chromium's own favicon store is used again; newer Chromium exposes `browser`, which had been misdetected as Firefox. This also stops Firefox-only permission fields from being sent on Chromium for weather and AI permission requests.
- No new permissions are requested.
- 0.12.2 was not published to the store, so 0.12.3 also includes its automatic site names for new shortcuts and imports.

## 更新内容 — 简体中文

- 网站图标现在会真正缓存：再次打开新标签页时，第一帧就显示缓存的图标、字母或品牌标记，不再重新探测网站。
- 缓存的图标在 7 天后刷新时仍然保持可见，30 天后移除。
- 图标查找失败后依次等待 1 小时、6 小时、24 小时再重试。
- 缓存迁移到 localStorage `mnt.iconCache:v3`，多个标签页之间会合并，最多保留 1024 个站点。
- 重新使用 Chromium 自带的 favicon 存储；较新的 Chromium 会暴露 `browser`，此前被误判为 Firefox。这也修复了在 Chromium 上请求天气和 AI 权限时误带 Firefox 专有字段的问题。
- 未新增任何权限。
- 0.12.2 未发布到商店，因此 0.12.3 同时包含其新建快捷方式和导入的自动站点名称功能。

## Notes for certification

```text
Promptab replaces the browser's new tab with a customizable dashboard. No Promptab account or login is required. Core features and manual AI copy/paste require no API key. Optional direct AI requests use a key supplied for that session and require the user's own Anthropic or OpenAI key; provider charges may apply.

To test, install the extension, open a new tab, then open a second new tab. Website icons should paint from the local cache on the first frame without probing the sites again. Clearing the icon cache from Settings makes the next new tab look icons up again. Cached entries refresh after 7 days and are dropped after 30 days; failed lookups are retried after 1 hour, then 6 hours, then 24 hours. The cache is stored in localStorage under mnt.iconCache:v3 and holds up to 1024 sites.

Required permissions are storage, unlimitedStorage and Chromium's favicon permission. Optional bookmarks permission is requested only when the user chooses browser bookmark folders. Optional host permissions for Anthropic, OpenAI and Open-Meteo are requested only when the corresponding direct AI or weather action is used. No permission is added in this release.

All executable extension code is packaged. Promptab does not fetch or execute remote code. The extension_pages CSP is: script-src 'self'; object-src 'none'; font-src 'self' data: blob:
```

## 精简版 publish_notes

```text
Website icons now persist: a second new tab shows cached icons, letters or brand marks immediately, refreshes after 7 days, and backs off failed lookups. Automatic site names for new shortcuts and imports are included from 0.12.2. No new permissions. All code is packaged. CSP: script-src 'self'; object-src 'none'; font-src 'self' data: blob:
```

Character count: **343** (including spaces and punctuation; excluding the Markdown code fence).

## Manifest and permission differences from 0.12.2

Compared with `1c7a293` (`public/manifest.json`), the only manifest change is `version`: `0.12.2` → `0.12.3`. The required permissions (`storage`, `unlimitedStorage`, `favicon`), optional permission (`bookmarks`), optional host permissions (Anthropic, OpenAI, and Open-Meteo endpoints), and extension pages CSP are unchanged. No new permission is requested.

## Release steps and status

1. Confirm the 0.12.3 release branch is merged into `main`, CI is green, and the listing, screenshots, privacy policy, and permissions are accurate.
2. Confirm Microsoft Partner Center has no newer published version or active submission.
3. Run the existing **Publish Edge Add-on** workflow manually against `main`; keep the default product ID and paste the compact `publish_notes` above. This document does not trigger the workflow.
4. Check the workflow logs and Partner Center submission status. Successful upload/submission is not the same as certification approval or store publication.
5. After approval, verify the public listing, install/update from the store, and check the release version and permissions.

**Status (2026-11-07): 待提交。** No upload, workflow run, or store submission has been started.
