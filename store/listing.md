# Minimal New Tab — Store Listing

## Short description

A calm, customizable new tab with profiles, themes, layouts, shortcuts, and local-first settings.

## 中文短描述

安静、可定制的新标签页：配置文件、主题、布局、快捷方式与本地优先设置。

## Full description

Minimal New Tab turns the new-tab page into a focused personal desktop without accounts, ads, or telemetry.

- Build a homepage with clocks, dates, search, bookmark groups, and shortcuts.
- Switch between curated themes and light/dark/system appearance modes.
- Arrange content with layout templates, columns, alignment, and widget visibility controls.
- Create multiple profiles for different workflows and keep a local history for undo and recovery.
- Import selected browser-bookmark folders on demand through an optional permission.
- Customize shortcut icons with automatic favicons, brand icons, Lucide icons, text, emoji, or your own image.
- Add local wallpapers, fonts, and CSS with validation and safe-mode recovery.
- Export and restore backups when you choose.
- Explore the local AI workbench for structured theme/profile suggestions; no built-in AI network client is included.

Minimal New Tab stores settings and assets in browser-managed extension storage. It does not include an account, advertising SDK, analytics, telemetry, or a developer-operated data service. Some features necessarily contact destinations you choose: search queries go to your selected search provider, shortcuts open their websites, automatic favicon fallback may request the site's `/favicon.ico`, and remote images or wallpapers are fetched from their configured URLs.

## 中文完整介绍

Minimal New Tab 把新标签页变成专注、可自定义的个人桌面，不需要账号，不含广告和遥测。

- 使用时钟、日期、搜索、书签分组和快捷方式搭建主页。
- 使用主题，以及浅色、深色或跟随系统的外观模式。
- 通过布局模板、列数、对齐方式和组件显示开关安排内容。
- 为不同工作流创建多个配置文件，并保留本地历史以支持撤销和恢复。
- 仅在你主动选择时，通过可选权限导入指定浏览器书签文件夹。
- 使用自动网站图标、品牌图标、Lucide 图标、文字、表情或自定义图片。
- 添加本地壁纸、字体和 CSS，并使用校验与安全模式恢复。
- 在你主动操作时导出和恢复备份。
- 使用本地 AI 工作台生成和校验结构化主题/配置建议；扩展不包含内置 AI 网络客户端。

设置和资源保存在浏览器管理的扩展存储中。扩展不包含账号、广告 SDK、分析、遥测或开发者运营的数据服务。部分功能会联系你选择的目标：搜索查询会发送到你选择的搜索服务，快捷方式会打开对应网站，自动图标的后备逻辑可能请求网站的 `/favicon.ico`，远程图片或壁纸会从配置的地址获取。

## Permissions disclosure

- **Storage:** Saves settings, profiles, history, and locally managed assets in extension storage.
- **Unlimited storage:** Allows larger local profiles and assets.
- **Favicon:** Lets the browser provide favicon data for shortcut sites; the implementation also has a direct `/favicon.ico` fallback.
- **Bookmarks (optional):** Requested only when you start browser-bookmark import, then used to read the tree and copy the folders you select.

## Suggested category and keywords

**Category:** Productivity

**Keywords:** new tab, dashboard, bookmarks, themes, customization, productivity, local-first, profiles, wallpapers, CSS

## Support / privacy URL

Publish `store/privacy-policy.md` at the project's public policy URL before submitting the listing. Keep the published policy in sync with the extension behavior and manifest permissions.
