# Promptab 0.13.0 商店发布材料

## What's new — English

- Drag shortcuts on the home page without entering edit mode; a placeholder shows where the icon will land and folder tiles highlight when dragged over.
- Drag shortcuts into a folder tile, reorder them inside the folder dialog, and drag out of the dialog onto the desktop or into another folder.
- Cancel a drag with Esc or by dropping on nothing; every completed drag can be undone in one step.
- Drag with touch by holding, then moving; mouse, pen, and trackpad work too.
- Tabs that are already open pick up changes saved in another tab, so edits are no longer lost with a storage error.
- The drag code loads only when you interact, so startup stays fast.
- No new permissions are requested.

## 更新内容 — 简体中文

- 无需进入编辑模式，即可在主页拖动快捷方式；占位符显示落点，文件夹磁贴在拖动经过时高亮。
- 可将快捷方式拖入文件夹磁贴，在文件夹对话框中重新排序，或拖出对话框放到桌面或另一个文件夹。
- 按 Esc 或拖到空白处可取消；每次完成的拖动都可以一步撤销。
- 触摸时按住后再拖动；鼠标、触控笔和触控板同样可用。
- 已打开的标签页会同步另一个标签页保存的更改，不再因存储错误丢失编辑。
- 拖动代码只在交互时加载，启动保持快速。
- 未新增任何权限。

## Notes for certification

```text
Promptab replaces the browser's new tab with a customizable dashboard. No Promptab account or login is required. Core features and manual AI copy/paste require no API key. Optional direct AI requests use a key supplied for that session and require the user's own Anthropic or OpenAI key; provider charges may apply.

To test, install the extension and open a new tab. Drag a shortcut with the mouse to another position: a placeholder shows the drop position, neighbouring icons shift, and dropping reorders them. Drag a shortcut onto a folder tile to move it into that folder. Open the folder dialog, reorder items inside it, and drag an item out past the dialog onto the desktop or onto another folder; the dialog closes and the drag continues. Start a drag and press Esc, or drop on empty space: nothing changes. After a completed drag, undo with the toast or Ctrl+Z and check that the whole move is restored in one step. With touch, hold on a shortcut, then drag. Open two new tabs, move a shortcut in one, and confirm the other tab picks up the change; edits saved in either tab are no longer lost with a storage error.

Required permissions are storage, unlimitedStorage and Chromium's favicon permission. Optional bookmarks permission is requested only when the user chooses browser bookmark folders. Optional host permissions for Anthropic, OpenAI and Open-Meteo are requested only when the corresponding direct AI or weather action is used. No permission is added in this release.

All executable extension code is packaged. Promptab does not fetch or execute remote code. The extension_pages CSP is: script-src 'self'; object-src 'none'; font-src 'self' data: blob:
```

## 精简版 publish_notes

```text
Drag shortcuts on the home page without edit mode, into and out of folders, with Esc to cancel and one undo step per drag; touch hold-and-drag works too. Open tabs now adopt edits saved in another tab. No new permissions. All code is packaged. CSP: script-src 'self'; object-src 'none'; font-src 'self' data: blob:
```

Character count: **314** (including spaces and punctuation; excluding the Markdown code fence).

## Manifest and permission differences from 0.12.4

Compared with `77199b3` (`public/manifest.json`), the only manifest change is `version`: `0.12.4` → `0.13.0`. The required permissions (`storage`, `unlimitedStorage`, `favicon`), optional permission (`bookmarks`), optional host permissions (Anthropic, OpenAI, and Open-Meteo endpoints), and extension pages CSP are unchanged. No new permission is requested.

## Release steps and status

1. Confirm the 0.13.0 release branch is merged into `main`, CI is green, and the listing, screenshots, privacy policy, and permissions are accurate.
2. Confirm Microsoft Partner Center has no newer published version or active submission.
3. Run the existing **Publish Edge Add-on** workflow manually against `main`; keep the default product ID and paste the compact `publish_notes` above. This document does not trigger the workflow.
4. Check the workflow logs and Partner Center submission status. Successful upload/submission is not the same as certification approval or store publication.
5. After approval, verify the public listing, install/update from the store, and check the release version and permissions.

**Status (2026-11-08): 待提交。** No upload, workflow run, or store submission has been started.
