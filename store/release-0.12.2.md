# Promptab 0.12.2 商店发布材料

## What's new — English

- New shortcuts fill their name automatically from a bundled site list or the domain, such as claude.ai → Claude; a name you type is never overwritten.
- Tidy over-long or "Home | Site" titles when importing browser bookmarks while keeping short titles as-is.
- Give Infinity items with empty or URL-like names a readable name.
- No new permissions are requested and no new network requests are made.

## 更新内容 — 简体中文

- 新建快捷方式时，名称会根据内置站点列表或域名自动填写，例如 claude.ai → Claude；已输入的名称不会被覆盖。
- 导入浏览器书签时，过长或“Home | Site”式的标题会被整理，短标题保持不变。
- Infinity 中名称为空或类似网址的条目会获得可读的名称。
- 未新增任何权限，也未新增任何网络请求。

## Notes for certification

```text
Promptab replaces the browser's new tab with a customizable dashboard. No Promptab account or login is required. Core features and manual AI copy/paste require no API key. Optional direct AI requests use a key supplied for that session and require the user's own Anthropic or OpenAI key; provider charges may apply.

To test, install the extension and open a new tab. Add a shortcut and paste https://claude.ai; its name fills in as Claude. Type a custom name first and confirm it is not overwritten when the URL changes. Browser bookmark and Infinity backups imports tidy empty, URL-like, or over-long names. The bundled site-name list is packaged, so this release makes no new network requests.

Required permissions are storage, unlimitedStorage and Chromium's favicon permission. Optional bookmarks permission is requested only when the user chooses browser bookmark folders. Optional host permissions for Anthropic, OpenAI and Open-Meteo are requested only when the corresponding direct AI or weather action is used. No permission is added in this release.

All executable extension code is packaged. Promptab does not fetch or execute remote code. The extension_pages CSP is: script-src 'self'; object-src 'none'; font-src 'self' data: blob:
```

## 精简版 publish_notes

```text
New shortcuts fill their name from a bundled site list or domain; bookmark and Infinity imports tidy messy names; typed names are kept. No login required. Optional AI requests use the user's own key; optional hosts are requested only when used. No new permissions or network requests. All code is packaged. CSP: script-src 'self'; object-src 'none'; font-src 'self' data: blob:
```

Character count: **377** (including spaces and punctuation; excluding the Markdown code fence).

## Manifest and permission differences from 0.12.1

Compared with `20185d8` (`public/manifest.json`), the only manifest change is `version`: `0.12.1` → `0.12.2`. The required permissions (`storage`, `unlimitedStorage`, `favicon`), optional permission (`bookmarks`), optional host permissions (Anthropic, OpenAI, and Open-Meteo endpoints), and extension pages CSP are unchanged. No new permission or network request is added.

## Release steps and status

1. Confirm the 0.12.2 release branch is merged into `main`, CI is green, and the listing, screenshots, privacy policy, and permissions are accurate.
2. Confirm Microsoft Partner Center has no newer published version or active submission.
3. Run the existing **Publish Edge Add-on** workflow manually against `main`; keep the default product ID and paste the compact `publish_notes` above. This document does not trigger the workflow.
4. Check the workflow logs and Partner Center submission status. Successful upload/submission is not the same as certification approval or store publication.
5. After approval, verify the public listing, install/update from the store, and check the release version and permissions.

**Status (2026-11-06): 待提交。** No upload, workflow run, or store submission has been started.
