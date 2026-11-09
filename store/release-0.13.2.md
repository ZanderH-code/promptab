# Promptab 0.13.2 商店发布材料

## What's new — English

- Dragged icons stay under the cursor on the home page, inside folders, and when dragged out of a folder. Before, the icon jumped between grid slots, did not move over a folder, and was offset by about 250 px after leaving a folder.
- The dragged icon lifts with a shadow, a dashed placeholder stays in its original spot, and the drop animates into place (none with reduced motion).
- The folder under a dragged icon gets a clearer highlight.
- On touch screens, the browser's long-press menu no longer cancels a drag and loses the drop.
- No new permissions are requested, and the drag code still loads only when needed.

## 更新内容 — 简体中文

- 拖动中的图标在主页、文件夹内以及拖出文件夹时都跟随光标。此前图标会在网格槽位之间跳动，经过文件夹时不移动，拖出文件夹后还会偏移约 250 px。
- 拖动中的图标会抬起并带阴影，原位置留下虚线占位符，放下时播放入位动画（减少动态效果时不播放）。
- 图标经过的文件夹会显示更明显的高亮。
- 在触摸屏上，浏览器的长按菜单不再取消拖动并丢失放置。
- 未新增任何权限，拖动代码仍只在需要时加载。

## Notes for certification

```text
Promptab replaces the browser's new tab with a customizable dashboard. No Promptab account or login is required. Core features and manual AI copy/paste require no API key. Optional direct AI requests use a key supplied for that session and require the user's own Anthropic or OpenAI key; provider charges may apply.

To test, install the extension and open a new tab. Drag a shortcut across the home page: the lifted icon stays under the cursor, a dashed placeholder marks its original spot, the folder under the cursor highlights, and the drop animates into place. Open a folder dialog and reorder items inside it; then drag an item out past the dialog edge and drop it on the desktop or another folder: the dialog closes, the icon keeps following the cursor, and the drop lands where released. With touch, hold a shortcut and drag: the browser's long-press menu must not appear or cancel the drag, and the drop must be kept. With reduced motion enabled, the icon still follows the cursor and the lift and drop animations are off.

Required permissions are storage, unlimitedStorage and Chromium's favicon permission. Optional bookmarks permission is requested only when the user chooses browser bookmark folders. Optional host permissions for Anthropic, OpenAI and Open-Meteo are requested only when the corresponding direct AI or weather action is used. No permission is added in this release.

All executable extension code is packaged. Promptab does not fetch or execute remote code. The extension_pages CSP is: script-src 'self'; object-src 'none'; font-src 'self' data: blob:
```

## 精简版 publish_notes

```text
Dragged icons now stay under the cursor on the home page, inside folders and when dragged out, with a lift, a dashed placeholder and an animated drop; long-press no longer cancels touch drags. No new permissions. All code is packaged. CSP: script-src 'self'; object-src 'none'; font-src 'self' data: blob:
```

Character count: **305** (including spaces and punctuation; excluding the Markdown code fence).

## Manifest and permission differences from 0.13.1

Compared with `2fad863` (`public/manifest.json`), the only manifest change is `version`: `0.13.1` → `0.13.2`. The required permissions (`storage`, `unlimitedStorage`, `favicon`), optional permission (`bookmarks`), optional host permissions (Anthropic, OpenAI, and Open-Meteo endpoints), and extension pages CSP are unchanged. No new permission is requested.

## Release steps and status

1. Confirm the 0.13.2 release branch is merged into `main`, CI is green, and the listing, screenshots, privacy policy, and permissions are accurate.
2. Confirm Microsoft Partner Center has no newer published version or active submission.
3. Run the existing **Publish Edge Add-on** workflow manually against `main`; keep the default product ID and paste the compact `publish_notes` above. This document does not trigger the workflow.
4. Check the workflow logs and Partner Center submission status. Successful upload/submission is not the same as certification approval or store publication.
5. After approval, verify the public listing, install/update from the store, and check the release version and permissions.

**Status (2026-11-09): 待提交。** No upload, workflow run, or store submission has been started.
