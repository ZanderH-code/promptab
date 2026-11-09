# Promptab 0.14.0 商店发布材料

## What's new — English

- Settings navigation is now a grouped vertical rail — Look, Layout, Content, Advanced and System — so the ten sections fit without wrapping.
- Settings search highlights the matched text and explains results that match only a hidden keyword or the section name.
- The Websites section has an “Edit websites” action that closes settings and enters desktop editing.
- On screens 1024 px wide and up, the page stays at full brightness while settings are open; the new Peek button slides the panel away and leaves an edge handle to bring it back (click or Esc).
- Custom CSS drafts are no longer lost when switching sections or closing and reopening settings, each profile keeps its own draft, and the editor now follows light, dark, high-contrast and custom themes.
- The Custom CSS status says “Disabled” when custom CSS is off, image/video upload controls only appear for those background types, and the area grid rejects duplicate rows or removal of the shortcuts area with an inline message.
- Sections were renamed to Theme, Areas & grid, Websites, Custom CSS, AI assistant and Backup & import; the websites hint and English plural were corrected.
- No new permissions are requested.

## 更新内容 — 简体中文

- 设置导航改为分组竖排（外观、布局、内容、高级、系统），十个分区无需换行即可看到。
- 设置搜索会高亮匹配文字，并说明仅通过隐藏关键词或分区名匹配的结果。
- 「网站」分区新增「编辑网站」按钮，点击后关闭设置并进入桌面编辑。
- 窗口宽度 ≥ 1024 px 时，设置打开期间页面保持全亮；新增「预览页面」按钮可将面板滑出屏幕，并留下边缘把手（点击或按 Esc 恢复）。
- 切换分区、关闭再打开设置时不再丢失自定义 CSS 草稿，每个配置各自保留草稿；编辑器跟随浅色、深色、高对比和自定义主题。
- 自定义 CSS 关闭时状态显示「已禁用」；上传控件只在图片/视频背景类型下出现；区域网格拒绝重复行或删除快捷方式区域，并显示行内提示。
- 分区更名为主题、区域与网格、网站、自定义 CSS、AI 助手、备份与导入；修正了网站提示文案和英文单复数。
- 未新增任何权限。

## Notes for certification

```text
Promptab replaces the browser's new tab with a customizable dashboard. No Promptab account or login is required. Core features and manual AI copy/paste require no API key. Optional direct AI requests use a key supplied for that session and require the user's own Anthropic or OpenAI key; provider charges may apply.

To test, install the extension and open a new tab. Open Settings: the sections are grouped in a vertical rail on the left and the page behind the panel is at full brightness. Switch between sections with the arrow keys. Change the theme and the background type; image and video upload controls appear only for those two types. Type “blur” in the settings search — matching text is highlighted, and rows that match only through a keyword say “matches: …”. Clear the search, open Custom CSS and type a rule: switch sections and close/reopen settings — the draft is still there; Apply makes it visible. Click Peek: the panel slides off-screen and a “Show settings” handle stays on the right edge; click it or press Esc to return. Below 1024 px the page uses the dimmed scrim and there is no Peek button. No new permission is requested.

Required permissions are storage, unlimitedStorage and Chromium's favicon permission. Optional bookmarks permission is requested only when the user chooses browser bookmark folders. Optional host permissions for Anthropic, OpenAI and Open-Meteo are requested only when the corresponding direct AI or weather action is used. No permission is added in this release.

All executable extension code is packaged. Promptab does not fetch or execute remote code. The extension_pages CSP is: script-src 'self'; object-src 'none'; font-src 'self' data: blob:
```

## 精简版 publish_notes

```text
Settings now use a grouped vertical rail with highlighted, explained search results. Custom CSS drafts survive section switches and reload scoping per profile, the editor follows every theme, and on wide screens the page stays bright with a Peek handle. Websites gain an Edit websites action. No new permissions. All code is packaged. CSP: script-src 'self'; object-src 'none'; font-src 'self' data: blob:
```

Character count: **405** (including spaces and punctuation; excluding the Markdown code fence).

## Manifest and permission differences from 0.13.2

Compared with the 0.13.2 manifest, the only manifest change is `version`: `0.13.2` → `0.14.0`. The required permissions (`storage`, `unlimitedStorage`, `favicon`), optional permission (`bookmarks`), optional host permissions (Anthropic, OpenAI, and Open-Meteo endpoints), and extension pages CSP are unchanged. No new permission is requested.

The only new runtime dependency is `@radix-ui/react-tabs` (MIT). It is imported only by `SettingsDrawer`, which is lazy-loaded with the settings chunk; the startup scripts do not change as a result.

## Privacy

No data-use change. The unsaved Custom CSS draft stays in page memory and is not stored until the user chooses Apply; the stored CSS remains part of the profile as before. No new data collection, transmission, or storage is added.

## Startup

Measured startup JavaScript after 0.14.0 packaging: **472,981 bytes raw** (gzip 151,712), under the 480,000-byte budget. The settings rail and Peek control load with the lazy settings chunk.

## Release steps and status

1. Confirm the 0.14.0 release branch is merged into `main`, CI is green, and the listing, screenshots, privacy policy, and permissions are accurate.
2. Confirm Microsoft Partner Center has no newer published version or active submission.
3. Run the existing **Publish Edge Add-on** workflow manually against `main`; keep the default product ID and paste the compact `publish_notes` above. This document does not trigger the workflow.
4. Check the workflow logs and Partner Center submission status. Successful upload/submission is not the same as certification approval or store publication.
5. After approval, verify the public listing, install/update from the store, and check the release version and permissions.

**Status (2026-11-09): 待提交。** No upload, workflow run, or store submission has been started.
