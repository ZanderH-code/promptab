# Promptab 0.12.0 商店发布材料

## What's new — English

- Open bookmark groups in accessible folder dialogs with keyboard navigation, focus restoration, and support for phone sized screens.
- Find all Settings tabs without horizontal scrolling; tabs wrap when the window is narrow.
- Get clearer website icons: Promptab tries browser-provided and same-origin icon sources, rejects Chromium's default globe placeholder, and upgrades to sharper icons when available. Icon results use a separate expiring cache.

## 更新内容 — 简体中文

- 书签分组可在文件夹弹窗中打开，支持键盘操作、焦点恢复和手机屏幕。
- 设置标签页会在窄窗口中换行，无需横向滚动即可查看全部标签。
- 网站图标更清晰：Promptab 会尝试浏览器提供及网站同源图标，跳过 Chromium 默认地球占位图，并在有高清图标时升级。图标结果保存在独立的限时缓存中。

## Notes for certification

```text
Promptab replaces the browser's new tab with a customizable dashboard. No Promptab account or login is required. Core features and manual AI copy/paste require no API key. Optional direct AI requests use a key supplied for that session and require the user's own Anthropic or OpenAI key; provider charges may apply.

To test, install the extension and open a new tab. Open a bookmark group to inspect its folder dialog, keyboard navigation and focus restoration. Open Settings at a narrow window width and check that every tab remains visible. Website icons load automatically and may upgrade after the initial page render.

Required permissions are storage, unlimitedStorage and Chromium's favicon permission. Optional bookmarks permission is requested only when the user chooses browser bookmark folders. Optional host permissions for Anthropic, OpenAI and Open-Meteo are requested only when the corresponding direct AI or weather action is used. No permission is added in this release.

All executable extension code is packaged. Promptab does not fetch or execute remote code. The extension_pages CSP is: script-src 'self'; object-src 'none'; font-src 'self' data: blob:
```

## 精简版 publish_notes

```text
No Promptab account or login is required. Open a new tab to test bookmark folder dialogs, keyboard focus restoration, and website icons that upgrade after initial render. In Settings at a narrow width, verify all tabs remain visible. Manual AI copy/paste needs no key. Optional direct AI requests need the user's own Anthropic or OpenAI key and request the selected provider host only when sent; bookmarks and weather hosts are also optional and requested when used. No permissions were added. All executable code is packaged. CSP: script-src 'self'; object-src 'none'; font-src 'self' data: blob:
```

Character count: **597** (including spaces and punctuation; excluding the Markdown code fence).

## Manifest and permission differences from 0.11.0

Compared with `6e6f7c3` (`public/manifest.json`), the only manifest change is `version`: `0.11.0` → `0.12.0`. The required permissions (`storage`, `unlimitedStorage`, `favicon`), optional permission (`bookmarks`), optional host permissions (Anthropic, OpenAI, and Open-Meteo endpoints), and extension pages CSP are unchanged. No new permission is requested.

## Release steps and status

1. Confirm the 0.12.0 release branch is merged into `main`, CI is green, and the listing, screenshots, privacy policy, and permissions are accurate.
2. Confirm Microsoft Partner Center has no newer published version or active submission.
3. Run the existing **Publish Edge Add-on** workflow manually against `main`; keep the default product ID and paste the compact `publish_notes` above. This document does not trigger the workflow.
4. Check the workflow logs and Partner Center submission status. Successful upload/submission is not the same as certification approval or store publication.
5. After approval, verify the public listing, install/update from the store, and check the release version and permissions.

**Status (2026-11-06): 待提交。** No upload, workflow run, or store submission has been started.
