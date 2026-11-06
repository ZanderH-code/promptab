# Promptab 0.12.1 商店发布材料

## What's new — English

- Stop an upscaled browser favicon from outranking real high-resolution icons such as Reddit and YouTube.
- Use bundled known official icon URLs for ChatGPT, v0, AI Studio, ai.google.dev, NotebookLM, DeepSeek, Grok, Outlook, Reddit, TradingView, CoinMarketCap, IBKR, and Wealthsimple.
- Show bundled brand marks for Gemini, Instagram, YouTube, Dify, NotebookLM, v0, DeepSeek, and Google Maps when no good icon loads.
- Keep Google Maps on www.google.com/maps from sharing the rest of Google's icon.
- Retry old icon failures with cache version 2 and a one-hour failure cache.
- No new permissions are requested.

## 更新内容 — 简体中文

- 放大后的浏览器图标不再压过 Reddit、YouTube 等网站真正的高清图标。
- 为 ChatGPT、v0、AI Studio、ai.google.dev、NotebookLM、DeepSeek、Grok、Outlook、Reddit、TradingView、CoinMarketCap、IBKR 和 Wealthsimple 内置已知的官方图标地址。
- 在无法加载合适图标时，为 Gemini、Instagram、YouTube、Dify、NotebookLM、v0、DeepSeek 和 Google Maps 使用内置品牌标记。
- www.google.com/maps 上的 Google Maps 不再与 Google 其他页面共用图标。
- 图标缓存升级到 v2，旧的失败记录会重试，失败缓存为 1 小时。
- 未新增任何权限。

## Notes for certification

```text
Promptab replaces the browser's new tab with a customizable dashboard. No Promptab account or login is required. Core features and manual AI copy/paste require no API key. Optional direct AI requests use a key supplied for that session and require the user's own Anthropic or OpenAI key; provider charges may apply.

To test, install the extension and open a new tab. Website icons load automatically; icons for sites such as Reddit, YouTube, ChatGPT, and Google Maps may upgrade after the initial page render. Check that known sites show their official marks and that www.google.com/maps does not show the general Google icon. Clearing the icon cache and reloading makes previously failed icons retry.

Required permissions are storage, unlimitedStorage and Chromium's favicon permission. Optional bookmarks permission is requested only when the user chooses browser bookmark folders. Optional host permissions for Anthropic, OpenAI and Open-Meteo are requested only when the corresponding direct AI or weather action is used. No permission is added in this release.

All executable extension code is packaged. Promptab does not fetch or execute remote code. The extension_pages CSP is: script-src 'self'; object-src 'none'; font-src 'self' data: blob:
```

## 精简版 publish_notes

```text
No Promptab login is required. Check that Reddit, YouTube, ChatGPT and other known sites show official high-res icons and www.google.com/maps has its own. Optional AI requests use the user's own key; optional provider, bookmarks and weather hosts are requested only when used. No new permissions. All code is packaged. CSP: script-src 'self'; object-src 'none'; font-src 'self' data: blob:
```

Character count: **389** (including spaces and punctuation; excluding the Markdown code fence).

## Manifest and permission differences from 0.12.0

Compared with `0299fd4` (`public/manifest.json`), the only manifest change is `version`: `0.12.0` → `0.12.1`. The required permissions (`storage`, `unlimitedStorage`, `favicon`), optional permission (`bookmarks`), optional host permissions (Anthropic, OpenAI, and Open-Meteo endpoints), and extension pages CSP are unchanged. No new permission is requested.

## Release steps and status

1. Confirm the 0.12.1 release branch is merged into `main`, CI is green, and the listing, screenshots, privacy policy, and permissions are accurate.
2. Confirm Microsoft Partner Center has no newer published version or active submission.
3. Run the existing **Publish Edge Add-on** workflow manually against `main`; keep the default product ID and paste the compact `publish_notes` above. This document does not trigger the workflow.
4. Check the workflow logs and Partner Center submission status. Successful upload/submission is not the same as certification approval or store publication.
5. After approval, verify the public listing, install/update from the store, and check the release version and permissions.

**Status (2026-11-06): 待提交。** No upload, workflow run, or store submission has been started.
