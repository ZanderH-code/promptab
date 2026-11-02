# Promptab — Store Listing

## English

### Short description

Your new tab, designed by your AI.

### Full description

**Describe it. Preview it. Make it yours.** Promptab turns your new tab into a customizable home for the things you use every day. Ask an AI assistant to design a theme, paste its reply, and preview the result before applying it. The manual workflow needs no Promptab account or API key. You can also send a request directly to Anthropic or OpenAI with your own session-only API key; provider charges may apply.

- Build a dashboard with clocks, dates, search, shortcuts, bookmark groups, and flexible layouts.
- Browse the theme gallery, preview themes, and personalize colors, fonts, shapes, and CSS.
- Add local image or video wallpapers and rotate a selection of wallpapers.
- Add Todo, Note, Countdown, and optional weather widgets. Weather requests happen only after you choose a weather action.
- Keep separate profiles, undo changes, and export or restore a backup.
- Opt in to browser sync for profile settings and shortcuts across signed-in devices. Wallpapers, videos, fonts, and uploaded shortcut images stay local.
- Import selected browser-bookmark folders only after granting the optional bookmarks permission.
- Choose automatic website icons, brand icons, Lucide icons, text, emoji, or your own images.
- Use the extension in English or Simplified Chinese. A separate desktop Firefox build is available.

Promptab stores its data in browser-managed extension storage and has no Promptab account, advertising SDK, analytics, or developer-operated application server. Opening the gallery fetches its index and selected packs from zanderh-code.github.io. When you use optional features, the selected AI provider receives the prompt, model, and API key; Open-Meteo receives the city or coordinates used for weather; and your browser's sync service processes synced profile data. Search providers, shortcut destinations, favicon sites, and configured remote image hosts receive the requests needed for those features.

### Permissions

- **Storage and unlimited storage:** Save profiles, settings, history, and locally managed assets.
- **Favicon (Chromium only):** Obtain browser-provided website icons; the site's `/favicon.ico` is used as a fallback.
- **Bookmarks (optional):** Requested when you start browser-bookmark import; only selected folders are copied.
- **AI provider hosts (optional):** Requested when you send to the selected Anthropic or OpenAI provider.
- **Open-Meteo hosts (optional):** Requested when you search for a city or load a weather forecast.

### Firefox Add-ons (AMO)

**Summary:** A customizable new tab with AI-assisted themes, shortcuts, widgets, optional weather, and browser sync.

**Category:** Productivity

**Data-collection notes:** The Firefox package declares no required data-collection categories. Optional `authenticationInfo` and `personalCommunications` apply when you choose to send an AI request directly: the selected provider receives your API key and prompt. Optional `locationInfo` applies only to weather, after you opt in to a weather action: Open-Meteo receives a city name or selected coordinates. A current-location request happens only when you choose it. Firefox asks for the relevant optional data permission alongside the provider host permission. Browser Sync is separately opt-in and is handled by the browser's sync service.

**Keywords:** new tab, dashboard, bookmarks, themes, widgets, weather, productivity, profiles, wallpapers, CSS

## 中文

### 短描述

一句话，让你的 AI 帮你设计新标签页。

### 完整介绍

**描述想法、预览效果，打造属于你的新标签页。** Promptab 让你自定义每天都会使用的主页。你可以让 AI 助手设计主题、粘贴回复，并在应用前预览。手动复制粘贴不需要 Promptab 账号或 API 密钥；也可以使用仅保存在当前界面会话中的密钥直接发送给 Anthropic 或 OpenAI，服务商可能收费。

- 使用时钟、日期、搜索、快捷方式和书签分组搭建主页，自由调整布局。
- 浏览主题画廊，在应用前预览，并调整颜色、字体、形状和 CSS。
- 使用本地图片或视频壁纸，轮换选择的壁纸。
- 添加待办、便签、倒计时和可选天气组件；只有主动使用天气功能时才发送天气请求。
- 创建多个配置档、撤销更改，并导出或恢复备份。
- 可选择开启浏览器同步，在已登录的设备之间同步配置和快捷方式；壁纸、视频、字体及上传的快捷方式图片保留在本地。
- 仅在你授权可选书签权限后，导入所选浏览器书签文件夹。
- 使用网站自动图标、品牌图标、Lucide 图标、文字、表情或自己的图片。
- 支持中文和英文界面，并提供独立的桌面 Firefox 构建。

Promptab 将数据保存在浏览器管理的扩展存储中，不含 Promptab 账号、广告 SDK、分析或开发者运营的应用服务器。打开画廊时会从 zanderh-code.github.io 获取索引和选中的主题包。使用可选功能时，所选 AI 服务商会收到提示、模型和 API 密钥；Open-Meteo 会收到天气查询所需的城市或坐标；浏览器同步服务会处理你选择同步的配置。搜索服务、快捷方式网站、网站图标来源及配置的远程图片主机也会收到相应请求。

## Support and privacy

Privacy policy: https://zanderh-code.github.io/promptab/privacy/

The project is released under the MIT License. Bundled dependencies retain their respective licenses; see `licenses/THIRD_PARTY_NOTICES.md` in the source repository. The published privacy policy must be updated to match the final release before submission.
