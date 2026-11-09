# Promptab 0.15.0 商店发布材料

## What's new — English

- Every settings section now has a sticky header with a one-line description and its “Restore section defaults” action, so both stay in view while you scroll.
- The Layout section draws the committed area grid. Screen readers hear the area names, custom areas can be renamed by clicking them in the diagram, and a rename follows the area through every breakpoint, widget and area style as one undo step.
- The gradient editor shows the real gradient at page size with its angle and stops, and says when gradients only render in dark mode.
- An image background shows a focal-point preview with a crosshair you can click or drag, sharing the stored position with the named buttons and X/Y sliders.
- Both wallpaper pickers are styled, localized controls that show the chosen file name and accept drag-and-drop.
- Background and layout controls now explain their effect in one line, and screen readers receive those explanations as the control's description.
- Clicks on the page behind settings are blocked at every width, and clicking the scrim dismisses the drawer without activating anything underneath.
- Settings search opens the Advanced layout fields it matches, and the raw layout DSL now sits behind an “Advanced” disclosure.
- No new permissions are requested.

## 更新内容 — 简体中文

- 每个设置分区都有吸顶标题、一句说明和「恢复本分区默认值」按钮，滚动时始终可见。
- 「区域与网格」会绘制当前已应用的区域网格；屏幕阅读器可以听到区域名称，点击图中的自定义区域即可重命名，重命名会同步到所有断点、组件和区域样式，并且只算一步撤销。
- 渐变编辑器按页面尺寸显示真实渐变、角度和色标，并说明渐变只在深色模式下渲染。
- 图片背景新增焦点预览和十字准线，可点击或拖动，与命名按钮和 X/Y 滑杆共享同一个位置值。
- 两个壁纸选择器改为带样式的本地化控件，显示已选文件名并支持拖放。
- 背景与布局控件各自增加了一句效果说明，屏幕阅读器会把说明读作控件的描述。
- 设置后方页面的点击在任何宽度下都会被拦截；点击遮罩会关闭设置面板，且不会触发下层页面。
- 设置搜索会展开它匹配到的「高级」布局字段；原始布局 DSL 现在收在「高级」折叠区中。
- 未新增任何权限。

## Notes for certification

```text
Promptab replaces the browser's new tab with a customizable dashboard. No Promptab account or login is required. Core features and manual AI copy/paste require no API key. Optional direct AI requests use a key supplied for that session and require the user's own Anthropic or OpenAI key; provider charges may apply.

To test, install the extension and open a new tab. Open Settings. Scroll a long section such as Areas & grid: the section title, description and “Restore section defaults” action stay at the top of the panel. In Areas & grid, the diagram shows the current area grid and its accessible name lists the areas. Add a custom area in the Advanced layout fields, then click it in the diagram to rename it; the DSL, widgets and page update together and one undo restores the previous name. Switch to Theme, choose the dark theme and a Gradient background: the strip shows the real gradient, and changing Angle or a colour stop updates it and the page. Choose an Image background, upload a picture with the styled button or by dropping it, then click or drag inside the focal-point preview; the X/Y values follow. Background and layout sliders show a one-line hint under the label, which is also their accessible description. Type “Column sizes” in settings search: the Advanced layout fields open so the matched field is visible. Below 1024 px the dimmed scrim blocks clicks on the page, and at every width clicking the scrim closes settings without opening anything underneath. No new permission is requested.

Required permissions are storage, unlimitedStorage and Chromium's favicon permission. Optional bookmarks permission is requested only when the user chooses browser bookmark folders. Optional host permissions for Anthropic, OpenAI and Open-Meteo are requested only when the corresponding direct AI or weather action is used. No permission is added in this release.

All executable extension code is packaged. Promptab does not fetch or execute remote code. The extension_pages CSP is: script-src 'self'; object-src 'none'; font-src 'self' data: blob:
```

## 精简版 publish_notes

```text
Settings sections now keep a sticky header with their description and reset action. Layout gains a live area-grid diagram with accessible area names and click-to-rename, the gradient editor shows the real result, image backgrounds get a draggable focal preview, and upload pickers are styled and localized. Behind-settings clicks are blocked at every width and the scrim dismisses settings without touching the page. No new permissions. All code is packaged. CSP: script-src 'self'; object-src 'none'; font-src 'self' data: blob:
```

Character count: **529**

## Manifest and permission differences from 0.14.0

Compared with the 0.14.0 manifest, the only manifest change is `version`: `0.14.0` → `0.15.0`. The required permissions (`storage`, `unlimitedStorage`, `favicon`), optional permission (`bookmarks`), optional host permissions (Anthropic, OpenAI, and Open-Meteo endpoints), and extension pages CSP are unchanged. No new permission is requested.

No new runtime dependency was added in this batch. The settings controls reuse the existing `lucide-react` icons and Radix components, all imported only by the lazy settings chunk.

## Privacy

No data-use change. The new previews (area grid, gradient, focal point) and the styled upload pickers are rendered from data already in the profile; no data is collected, transmitted or stored differently.

## Startup

Measured startup JavaScript with the 0.15.0 build: **477,350 bytes raw** (gzip 153,200), under the 480,000-byte budget. Every settings addition loads with the lazy settings chunk.

## Release steps and status

1. Confirm the 0.15.0 release branch is merged into `main`, CI is green, and the listing, screenshots, privacy policy, and permissions are accurate.
2. Confirm Microsoft Partner Center has no newer published version or active submission.
3. Run the existing **Publish Edge Add-on** workflow manually against `main`; keep the default product ID and paste the compact `publish_notes` above. This document does not trigger the workflow.
4. Check the workflow logs and Partner Center submission status. Successful upload/submission is not the same as certification approval or store publication.
5. After approval, verify the public listing, install/update from the store, and check the release version and permissions.

**Status (2026-11-09): 待提交。** No upload, workflow run, or store submission has been started.
