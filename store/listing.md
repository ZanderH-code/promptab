# Promptab — Store Listing

## Short description

Your new tab, designed by your AI.

## 中文短描述

一句话，让你的 AI 帮你设计新标签页。

## Full description

**Describe it. Paste it. Done.** Bring your own AI: ask ChatGPT, Claude, Kimi, DeepSeek, or any assistant you already use to design your new tab. The manual copy-and-paste workflow needs no Promptab account, API key, or extra AI credits. Optionally, send directly to Anthropic or OpenAI with your own API key; provider charges may apply. Promptab validates the result locally so you can preview it, apply it, and undo it anytime. Your settings and assets stay in browser storage on your device.

- Build a homepage with clocks, dates, search, bookmark groups, and shortcuts.
- Explore the theme gallery, copy an example prompt, and preview curated themes before applying them.
- Arrange content with layout templates, columns, alignment, and widget visibility controls.
- Create multiple profiles for different workflows and keep a local history for undo and recovery.
- Import selected browser-bookmark folders on demand through an optional permission.
- Customize shortcut icons with automatic favicons, brand icons, Lucide icons, text, emoji, or your own image.
- Add local wallpapers, fonts, and CSS with validation and safe-mode recovery.
- Export and restore backups when you choose.
- Copy a prompt to your AI, or optionally send it directly to Anthropic or OpenAI using your own API key and model. Provider charges may apply.

Promptab stores settings and assets in browser-managed extension storage. It does not include an account, advertising SDK, analytics, telemetry, or a developer-operated data service. Opening the theme gallery fetches its list from zanderh-code.github.io, and selecting a theme fetches its pack from the same host. Some features necessarily contact destinations you choose: search queries go to your selected search provider, shortcuts open their websites, automatic favicon fallback may request the site's `/favicon.ico`, and remote images or wallpapers are fetched from their configured URLs.

## 中文完整介绍

**想要什么样，就跟 AI 说什么样。** 用你已经在用的任何 AI（ChatGPT、Claude、Kimi、DeepSeek 等）设计新标签页。手动复制粘贴流程不需要 Promptab 账号、API 密钥或额外 AI 额度。你也可以使用自己的 API 密钥直接发送给 Anthropic 或 OpenAI，服务商可能收费。Promptab 在本地校验结果，你可以预览、应用并随时撤销；设置和资源保存在这台设备的浏览器存储中。

- 使用时钟、日期、搜索、书签分组和快捷方式搭建主页。
- 浏览主题画廊、复制示例提示，并在应用前预览精选主题。
- 通过布局模板、列数、对齐方式和组件显示开关安排内容。
- 为不同工作流创建多个配置文件，并保留本地历史以支持撤销和恢复。
- 仅在你主动选择时，通过可选权限导入指定浏览器书签文件夹。
- 使用自动网站图标、品牌图标、Lucide 图标、文字、表情或自定义图片。
- 添加本地壁纸、字体和 CSS，并使用校验与安全模式恢复。
- 在你主动操作时导出和恢复备份。
- 把提示包复制给你在用的 AI，或使用自己的 API 密钥和模型直接发送给 Anthropic 或 OpenAI；服务商可能收取 API 费用。

设置和资源保存在浏览器管理的扩展存储中。扩展不包含账号、广告 SDK、分析、遥测或开发者运营的数据服务。打开主题画廊时会从 zanderh-code.github.io 获取主题列表，选择主题时从同一主机获取主题包。部分功能会联系你选择的目标：搜索查询会发送到你选择的搜索服务，快捷方式会打开对应网站，自动图标的后备逻辑可能请求网站的 `/favicon.ico`，远程图片或壁纸会从配置的地址获取。

## Permissions disclosure

- **Storage:** Saves settings, profiles, history, and locally managed assets in extension storage.
- **Unlimited storage:** Allows larger local profiles and assets.
- **Favicon:** Lets the browser provide favicon data for shortcut sites; the implementation also has a direct `/favicon.ico` fallback.
- **Bookmarks (optional):** Requested only when you start browser-bookmark import, then used to read the tree and copy the folders you select.
- **AI provider origins (optional):** When you send directly, access is requested for the chosen provider, `api.anthropic.com` or `api.openai.com`. The prompt, model and API key are sent to that provider; the key is kept only in the interface session and is not saved in extension storage. The provider's privacy policy and pricing apply.

## Suggested category and keywords

**Category:** Productivity

**Keywords:** new tab, dashboard, bookmarks, themes, customization, productivity, local-first, profiles, wallpapers, CSS

## Support / privacy URL

Privacy policy: https://zanderh-code.github.io/promptab/privacy/

Keep the published policy in sync with the extension behavior and manifest permissions.

## Open-source license

The project is released under the MIT License. Bundled runtime dependencies retain their respective licenses; see `licenses/THIRD_PARTY_NOTICES.md` in the source repository.
