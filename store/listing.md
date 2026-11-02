# Promptab — Store Listing

## Short description

Your new tab, designed by your AI.

## 中文短描述

一句话，让你的 AI 帮你设计新标签页。

## Full description

**Describe it. Paste it. Done.** Bring your own AI: ask ChatGPT, Claude, Kimi, DeepSeek, or any assistant you already use to design your new tab. No Promptab account, API key, or extra AI credits required. Promptab validates the result locally so you can preview it, apply it, and undo it anytime. Your settings and assets stay in browser storage on your device.

- Build a homepage with clocks, dates, search, bookmark groups, and shortcuts.
- Switch between curated themes and light/dark/system appearance modes.
- Arrange content with layout templates, columns, alignment, and widget visibility controls.
- Create multiple profiles for different workflows and keep a local history for undo and recovery.
- Import selected browser-bookmark folders on demand through an optional permission.
- Customize shortcut icons with automatic favicons, brand icons, Lucide icons, text, emoji, or your own image.
- Add local wallpapers, fonts, and CSS with validation and safe-mode recovery.
- Export and restore backups when you choose.
- Let the AI you already use design structured theme/profile suggestions; Promptab itself has no built-in AI service or network client.

Promptab stores settings and assets in browser-managed extension storage. It does not include an account, advertising SDK, analytics, telemetry, or a developer-operated data service. Some features necessarily contact destinations you choose: search queries go to your selected search provider, shortcuts open their websites, automatic favicon fallback may request the site's `/favicon.ico`, and remote images or wallpapers are fetched from their configured URLs.

## 中文完整介绍

**想要什么样，就跟 AI 说什么样。** 用你已经在用的任何 AI（ChatGPT、Claude、Kimi、DeepSeek 等）设计新标签页。不需要 Promptab 账号、API key 或额外 AI 额度。Promptab 在本地校验结果，你可以预览、应用并随时撤销；设置和资源保存在这台设备的浏览器存储中。

- 使用时钟、日期、搜索、书签分组和快捷方式搭建主页。
- 使用主题，以及浅色、深色或跟随系统的外观模式。
- 通过布局模板、列数、对齐方式和组件显示开关安排内容。
- 为不同工作流创建多个配置文件，并保留本地历史以支持撤销和恢复。
- 仅在你主动选择时，通过可选权限导入指定浏览器书签文件夹。
- 使用自动网站图标、品牌图标、Lucide 图标、文字、表情或自定义图片。
- 添加本地壁纸、字体和 CSS，并使用校验与安全模式恢复。
- 在你主动操作时导出和恢复备份。
- 把提示包交给你已经在用的 AI，由它设计结构化主题/配置建议；Promptab 不提供内置 AI 服务或网络客户端。

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

Privacy policy: https://zanderh-code.github.io/promptab/privacy/

Keep the published policy in sync with the extension behavior and manifest permissions.

## Open-source license

The project is released under the MIT License. Bundled runtime dependencies retain their respective licenses; see `licenses/THIRD_PARTY_NOTICES.md` in the source repository.
