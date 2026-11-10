# Promptab 0.16.0 商店发布材料

## What's new — English

- Widget settings are grouped into cards that fold away; Search and Shortcuts stay single rows.
- Every settings row that differs from the default shows a dot and its own reset, so one changed value can be restored without resetting the whole section.
- Destructive settings actions ask in one accessible dialog that says exactly what is reset and what is kept. Cancel has focus, and the existing undo toast still restores the previous profile.
- The AI assistant's three steps fold, putting the review and apply controls within reach.
- The confirmation dialog returns focus to the control that opened it and keeps Tab inside itself.
- A newly selected settings section opens at its top instead of keeping the previous scroll position.
- Labels beside text fields and dropdowns now focus or open their control.
- No new permissions are requested.

## 更新内容 — 简体中文

- 组件设置按卡片分组，可折叠收起；搜索和网站保持单行。
- 每个与默认值不同的设置行都会显示圆点和独立的重置按钮，只恢复这一个值，不必重置整个分区。
- 破坏性设置操作统一使用一个无障碍确认对话框，明确说明会重置什么、保留什么；默认聚焦「取消」，现有的撤销提示仍可恢复之前的配置。
- AI 助手的三个步骤可以折叠，检查和应用的控件更容易看到。
- 确认对话框会把焦点交还给打开它的控件，并在对话框内部循环 Tab。
- 新打开的设置分区从顶部开始，不再沿用上一个分区的滚动位置。
- 点击文本字段和下拉框旁边的标签，会聚焦输入框或打开下拉框。
- 未新增任何权限。

## Notes for certification

```text
Promptab replaces the browser's new tab with a customizable dashboard. No Promptab account or login is required. Core features and manual AI copy/paste require no API key. Optional direct AI requests use a key supplied for that session and require the user's own Anthropic or OpenAI key; provider charges may apply.

To test, install the extension and open a new tab. Open Settings. In Widgets, the Clock and Date cards fold from their headings, while Search and Shortcuts remain single rows. Change a value such as Content width in Areas & grid: a dot and a reset button appear on that row, and the row reset restores only that value. Click “Restore section defaults” or “Reset settings”: one accessible dialog explains what is reset and what is kept, Cancel has focus, Esc and Cancel change nothing, and confirming shows the existing undo toast; Undo restores the previous profile. After closing the dialog, focus returns to the button that opened it, and Tab cycles between the dialog's buttons. Switch to another settings section after scrolling: the new section starts at the top. Click the labels beside the Time separator field or the Layout, Website style and Bookmark source dropdowns: the field takes focus or the listbox opens. In the AI assistant, Step 1 is expanded and the reply box in Step 2 is folded; open Step 2, paste a reply and the review step opens with its analysis. No new permission is requested.

Required permissions are storage, unlimitedStorage and Chromium's favicon permission. Optional bookmarks permission is requested only when the user chooses browser bookmark folders. Optional host permissions for Anthropic, OpenAI and Open-Meteo are requested only when the corresponding direct AI or weather action is used. No permission is added in this release.

All executable extension code is packaged. Promptab does not fetch or execute remote code. The extension_pages CSP is: script-src 'self'; object-src 'none'; font-src 'self' data: blob:
```

## 精简版 publish_notes

```text
Settings now group widget options into foldable cards, mark every row that differs from the default with its own reset, and confirm destructive resets and deletions in one accessible dialog that explains what is reset and what is kept. The dialog returns focus to its opener and keeps Tab inside. A new section starts at the top, row labels focus their fields and dropdowns, and the AI assistant's three steps fold. No new permissions. All code is packaged. CSP: script-src 'self'; object-src 'none'; font-src 'self' data: blob:
```

Character count: **533**

## Manifest and permission differences from 0.15.0

Compared with the 0.15.0 manifest, the only manifest change is `version`: `0.15.0` → `0.16.0`. The required permissions (`storage`, `unlimitedStorage`, `favicon`), optional permission (`bookmarks`), optional host permissions (Anthropic, OpenAI, and Open-Meteo endpoints), and extension pages CSP are unchanged. No new permission is requested.

No new runtime dependency was added in this batch. The confirmation dialog uses the browser's native `<dialog>` element; the collapsible widget cards and AI steps use native `<details>`; the new marks and reset actions reuse the existing `lucide-react` icons. Everything ships in the lazy settings chunk or the lazy AI workbench chunk.

## Privacy

No data-use change. Row marks, widgets cards, the confirmation dialog and the folded AI steps only change how existing settings are presented; no data is collected, transmitted or stored differently. The privacy policy and listing text are unchanged.

## Startup

Measured startup JavaScript with the 0.16.0 build: **478,628 bytes raw** (gzip 153,622), under the 480,000-byte budget. Every settings addition loads with the lazy settings chunk.

## Release steps and status

1. Confirm the 0.16.0 release branch is merged into `main`, CI is green, and the listing, screenshots, privacy policy, and permissions are accurate.
2. Confirm Microsoft Partner Center has no newer published version or active submission.
3. Run the existing **Publish Edge Add-on** workflow manually against `main`; keep the default product ID and paste the compact `publish_notes` above. This document does not trigger the workflow.
4. Check the workflow logs and Partner Center submission status. Successful upload/submission is not the same as certification approval or store publication.
5. After approval, verify the public listing, install/update from the store, and check the release version and permissions.

**Status (2026-11-10): 待提交。** No upload, workflow run, or store submission has been started.
