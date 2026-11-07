# Promptab 0.12.4 商店发布材料

## What's new — English

- Website icons stay visible on a new tab opened while another Promptab tab is open, or when two open at once.
- A custom icon image that cannot be decoded falls back to the letter instead of a broken-image glyph.
- A Lucide icon whose name no longer exists shows the letter instead of a blank.
- A cached icon whose 7-day refresh fails keeps showing and retries after 1 hour, then 6 hours, then 24 hours, instead of turning into a letter.
- No new permissions are requested.

## 更新内容 — 简体中文

- 在已打开另一个 Promptab 标签页时新建标签页，或同时打开两个新标签页，网站图标都能正常显示。
- 自定义图标图片无法解码时改为显示字母，不再显示破损图片。
- Lucide 图标名称已不存在时显示字母，不再空白。
- 缓存图标在 7 天刷新失败时继续保持显示，并依次在 1 小时、6 小时、24 小时后重试，不会变成字母。
- 未新增任何权限。

## Notes for certification

```text
Promptab replaces the browser's new tab with a customizable dashboard. No Promptab account or login is required. Core features and manual AI copy/paste require no API key. Optional direct AI requests use a key supplied for that session and require the user's own Anthropic or OpenAI key; provider charges may apply.

To test, install the extension and open a new tab, then keep it open and open a second new tab. Every shortcut icon must appear on the second tab, including cached icons. Opening two new tabs at once must also show the icons. A custom icon image that cannot be decoded, or a Lucide icon whose name no longer exists, shows a letter instead of a broken image or a blank. A cached icon whose 7-day refresh fails stays visible and retries after 1 hour, then 6 hours, then 24 hours. Clearing the icon cache from Settings makes the next new tab look icons up again.

Required permissions are storage, unlimitedStorage and Chromium's favicon permission. Optional bookmarks permission is requested only when the user chooses browser bookmark folders. Optional host permissions for Anthropic, OpenAI and Open-Meteo are requested only when the corresponding direct AI or weather action is used. No permission is added in this release.

All executable extension code is packaged. Promptab does not fetch or execute remote code. The extension_pages CSP is: script-src 'self'; object-src 'none'; font-src 'self' data: blob:
```

## 精简版 publish_notes

```text
Website icons now stay visible when a second new tab opens while another Promptab tab is open; failed refreshes keep the cached icon and back off, and undecodable images or unknown icons fall back to letters. No new permissions. All code is packaged. CSP: script-src 'self'; object-src 'none'; font-src 'self' data: blob:
```

Character count: **321** (including spaces and punctuation; excluding the Markdown code fence).

## Manifest and permission differences from 0.12.3

Compared with `0fea661` (`public/manifest.json`), the only manifest change is `version`: `0.12.3` → `0.12.4`. The required permissions (`storage`, `unlimitedStorage`, `favicon`), optional permission (`bookmarks`), optional host permissions (Anthropic, OpenAI, and Open-Meteo endpoints), and extension pages CSP are unchanged. No new permission is requested.

## Release steps and status

1. Confirm the 0.12.4 release branch is merged into `main`, CI is green, and the listing, screenshots, privacy policy, and permissions are accurate.
2. Confirm Microsoft Partner Center has no newer published version or active submission.
3. Run the existing **Publish Edge Add-on** workflow manually against `main`; keep the default product ID and paste the compact `publish_notes` above. This document does not trigger the workflow.
4. Check the workflow logs and Partner Center submission status. Successful upload/submission is not the same as certification approval or store publication.
5. After approval, verify the public listing, install/update from the store, and check the release version and permissions.

**Status (2026-11-07): 待提交。** No upload, workflow run, or store submission has been started.
