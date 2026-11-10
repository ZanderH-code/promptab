# Promptab 0.16.1 商店发布材料

## What's new — English

This update includes the 0.16.0 settings overhaul and the 0.16.1 first-paint fixes.

- Widget settings are grouped into cards that fold away; Search and Shortcuts stay single rows.
- Every settings row that differs from the default shows a dot and its own reset, so one changed value can be restored without resetting the whole section.
- Destructive settings actions ask in one accessible dialog that says exactly what is reset and what is kept. Cancel has focus, and the existing undo toast still restores the previous profile.
- The AI assistant's three steps fold, putting the review and apply controls within reach.
- Returning new tabs paint from the last saved profile instead of showing the loading screen while storage opens.
- The onboarding card renders with the first grid, so the page no longer re-centres after the grid appears.
- Image wallpapers paint a cached preview with the first content frame, then replace it with the full image without shifting the layout.
- Starter sites load only for the first-run migration, keeping startup JavaScript under the unchanged 480 KB budget.
- No new permissions are requested.

## 更新内容 — 简体中文

本版本包含 0.16.0 的设置界面改版和 0.16.1 的首屏绘制修复。

- 组件设置按卡片分组，可折叠收起；搜索和网站保持单行。
- 每个与默认值不同的设置行都会显示圆点和独立的重置按钮，只恢复这一个值，不必重置整个分区。
- 破坏性设置操作统一使用一个无障碍确认对话框，明确说明会重置什么、保留什么；默认聚焦「取消」，现有的撤销提示仍可恢复之前的配置。
- AI 助手的三个步骤可以折叠，检查和应用的控件更容易看到。
- 再次打开新标签页时，直接从上次保存的配置绘制，不再等待存储读取而显示加载画面。
- 引导卡片与首个网格一起绘制，页面不会在网格出现后重新居中。
- 图片壁纸在首个内容帧就用缓存的预览绘制，随后替换为完整图片，布局不会跳动。
- 起始网站只在首次迁移时加载，启动 JavaScript 保持在原有的 480 KB 预算内。
- 未新增任何权限。

## Notes for certification

```text
Promptab replaces the browser's new tab with a customizable dashboard. No Promptab account or login is required. Core features and manual AI copy/paste require no API key. Optional direct AI requests use a key supplied for that session and require the user's own Anthropic or OpenAI key; provider charges may apply.

To test the 0.16.0 settings changes, install the extension and open a new tab. Open Settings. In Widgets, the Clock and Date cards fold from their headings, while Search and Shortcuts remain single rows. Change a value such as Content width in Areas & grid: a dot and a reset button appear on that row, and the row reset restores only that value. Click “Restore section defaults” or “Reset settings”: one accessible dialog explains what is reset and what is kept, Cancel has focus, Esc and Cancel change nothing, and confirming shows the existing undo toast; Undo restores the previous profile. After closing the dialog, focus returns to the button that opened it, and Tab cycles between the dialog's buttons.

To test the 0.16.1 first-paint changes, start from a fresh profile: the first new tab shows the onboarding card and the starter sites, and no extra permission prompt appears. Reload or open another new tab: the clock, search and shortcuts paint immediately with the saved theme, without the “Preparing your desktop…” loading screen. In Settings, choose Background → Image and upload a picture. Open a new tab again: the wallpaper appears together with the content as a slightly softer preview, then resolves to the full image without any layout shift or colour jump. Dismiss the onboarding card and open another new tab: the card stays hidden and the layout does not move. Remove the image background and reopen: the theme background is shown and the old preview is ignored. All saved profiles and wallpaper previews remain on the device.

Required permissions are storage, unlimitedStorage and Chromium's favicon permission. Optional bookmarks permission is requested only when the user chooses browser bookmark folders. Optional host permissions for Anthropic, OpenAI and Open-Meteo are requested only when the corresponding direct AI or weather action is used. No permission is added in this release.

All executable extension code is packaged. Promptab does not fetch or execute remote code. The extension_pages CSP is: script-src 'self'; object-src 'none'; font-src 'self' data: blob:
```

## 精简版 publish_notes

```text
Returning new tabs paint from the last saved profile with no loading screen, the onboarding card renders with the first grid, and image wallpapers show a cached preview at first paint before the full image replaces it. Starter sites load only for the first-run migration, keeping startup JavaScript at 475,816 bytes raw, under the unchanged 480 KB budget. No new permissions or data collection. All executable code is packaged. CSP: script-src 'self'; object-src 'none'; font-src 'self' data: blob:
```

Character count: **498**

## Manifest and permission differences from 0.16.0

Compared with the 0.16.0 manifest, the only manifest change is `version`: `0.16.0` → `0.16.1`. The required permissions (`storage`, `unlimitedStorage`, `favicon`), optional permission (`bookmarks`), optional host permissions (Anthropic, OpenAI, and Open-Meteo endpoints), and extension pages CSP are unchanged. No new permission is requested.

No new runtime dependency was added. The first-paint work adds two local-only localStorage entries: `mnt:paint-cache:v1` (the active profile snapshot, without history, drafts, previews or binary data) and `mnt:wallpaper-preview:v1` (a downscaled JPEG, at most 64 KB, of the current image wallpaper). The flash measurement harness is development-only and is not packaged.

## Privacy

No data-use change. The new caches stay in the browser's local storage for this extension and are never transmitted; they only let the next new tab paint the last committed profile and wallpaper preview before storage and IndexedDB finish opening. Deleting a profile or changing the wallpaper removes the corresponding cache on the next commit or read. The privacy policy and listing text are unchanged.

## Startup

Measured startup JavaScript with the 0.16.1 build: **475,816 bytes raw** (gzip 151,265), under the unchanged 480,000-byte budget. This is 1,114 bytes more than F2b (474,702) and 2,812 bytes less than 0.16.0 (478,628).

## Release steps and status

1. Confirm the 0.16.1 release branch is merged into `main`, CI is green, and the listing, screenshots, privacy policy, and permissions are accurate.
2. Confirm Microsoft Partner Center has no newer published version or active submission.
3. Wait for 0.13.2 to finish certification, then run the existing **Publish Edge Add-on** workflow manually against `main`; keep the default product ID and paste the compact `publish_notes` above. This document does not trigger the workflow.
4. Check the workflow logs and Partner Center submission status. Successful upload/submission is not the same as certification approval or store publication.
5. After approval, verify the public listing, install/update from the store, and check the release version and permissions.

**Status (2026-11-10): 待提交 · 等待 0.13.2 认证结束后提交.** No upload, workflow run, or store submission has been started.
