# Promptab — Store Listing

## English

### Short description (Edge: 132 character limit)

A customizable new tab for themes, bookmarks, search, and daily tools.

### Full description (Edge and AMO: 10,000 character limit; 2,764 characters)

**Describe it. Preview it. Make it yours.** Promptab turns your new tab into a customizable home for the things you use every day. Ask an AI assistant to design a theme, paste its reply, and preview it before applying it. Manual copy and paste needs no account or API key. You can also send a request directly to Anthropic or OpenAI using your own API key for that session; provider charges may apply.

- Arrange clocks, dates, week numbers, search, shortcuts, bookmark groups, and widgets in flexible layouts.
- Open bookmark groups in folder dialogs, with keyboard navigation and focus restoration.
- Browse the public theme gallery, preview themes, and try them in the hosted web app. Install the web app as a PWA.
- Customize colors, fonts, shapes, and CSS; export theme packs or save themes locally.
- Use local image and video wallpapers, and rotate selected wallpapers.
- Add Todo, Note, Countdown, and optional weather widgets. Weather access is requested only when you use a weather feature.
- Choose where links open, use keyboard shortcuts, and set an accent color on open or cycle through the accent palette.
- Keep separate profiles, undo changes, and restore selected backup sections with one undo action.
- Optionally sync profile preferences, themes, layouts, and shortcuts using your browser's sync service. Wallpapers, videos, fonts, uploaded shortcut images, and saved themes remain on the device and are not synced.
- Choose from eleven search presets or enter a custom search template.
- Import Infinity New Tab backups locally, preview supported content, then add or replace sections with one-step undo. Remote Infinity images are skipped.
- Start with eight editable sites on a fresh install, with embedded icons; unchanged starter sites can be removed from Settings.
- Import selected browser bookmark folders after granting the optional bookmarks permission.
- Choose automatic website icons, brand or Lucide icons, text, emoji, or your own images. Automatic icons use browser-provided, site-origin, or bundled known official sources and a separate expiring cache.
- Use English or Simplified Chinese. A separate desktop Firefox build is available.

Promptab stores data in browser-managed extension storage. It has no Promptab account, advertising SDK, analytics, or developer-operated application server. Opening the gallery fetches its index and selected theme packs from zanderh-code.github.io. If you use direct AI, the selected provider receives your prompt, model, and API key. Open-Meteo receives the city or coordinates used for weather. Your browser's sync service handles data you choose to sync. Search engines and shortcut destinations receive requests when you use them. Automatic icon discovery runs in the background and can request the browser's favicon service, standard icon paths (`/apple-touch-icon.png`, `/apple-touch-icon-precomposed.png`, `/favicon.svg`, `/favicon-32x32.png`, `/favicon.ico`) from the shortcut site's own origin, and, for a small bundled list of known sites, their official icon URLs on the same origin or a CDN (for example Google gstatic, Microsoft onecdn, TradingView static, CoinMarketCap static); those sites or CDNs can observe the access. Some known sites use a bundled brand icon without a request. Best results, brand results and failures are cached per site for 7 days and 1 hour respectively in a separate local cache, not in profiles, backups, or sync; sites with a product path such as Google Maps keep a separate entry. Wallpaper and shortcut image files are stored locally; Promptab does not fetch remote wallpaper or shortcut-image URLs.

### Permissions

- **Storage and unlimited storage:** Save profiles, settings, history, and locally managed assets.
- **Favicon (Chromium only):** Obtain browser-provided website icons; site-origin icon paths are also tried.
- **Bookmarks (optional):** Requested when you start browser bookmark import; only selected folders are copied.
- **AI provider hosts (optional):** Requested when you send a direct request to the selected Anthropic or OpenAI provider.
- **Open-Meteo hosts (optional):** Requested when you search for a city or load a weather forecast.

### Firefox Add-ons (AMO)

**Summary (AMO: 250 character limit):** A customizable new tab with themes, bookmark folders, search presets, widgets, optional weather, keyboard controls, a public theme gallery, and browser sync.

**Category:** Productivity

**Data-collection notes:** The Firefox package declares no required data-collection categories. Optional `authenticationInfo` and `personalCommunications` apply when you choose direct AI: the selected provider receives your API key and prompt. Optional `locationInfo` applies only to weather; Open-Meteo receives a city name or selected coordinates. A current-location request happens only when you choose it. Firefox asks for the relevant optional data permission alongside the provider host permission. Browser Sync is separately opt-in and handled by the browser's sync service.

**Keywords:** new tab, dashboard, bookmarks, themes, widgets, weather, productivity, profiles, wallpapers, CSS

## 中文

### 短描述

自定义新标签页：主题、书签、搜索与日常工具一站整合。

### 完整介绍（994 字符）

**描述想法、预览效果，打造属于你的新标签页。** Promptab 让你自定义日常主页。你可以让 AI 助手设计主题、粘贴回复，并在应用前预览。手动复制粘贴不需要账号或 API 密钥；也可以使用仅在当前会话中提供的密钥，直接向 Anthropic 或 OpenAI 发送请求，服务商可能收费。

- 灵活安排时钟、日期、周数、搜索、快捷方式、书签分组和组件。
- 在文件夹弹窗中打开书签分组，支持键盘操作并在关闭后恢复焦点。
- 浏览公开主题画廊并预览主题，也可在网页版试用；网页版支持安装为 PWA。
- 自定义颜色、字体、形状和 CSS；导出主题包，或在本地保存主题。
- 使用本地图片或视频壁纸，并轮换所选壁纸。
- 添加待办、便签、倒计时和可选天气组件；仅在使用天气功能时请求天气服务权限。
- 设置链接打开方式、使用键盘快捷键，并设置打开时的强调色或循环调色板。
- 管理多个配置档、撤销更改，并选择恢复备份内容；整次恢复可一步撤销。
- 可选择通过浏览器同步服务同步配置偏好、主题、布局和快捷方式；壁纸、视频、字体、上传的快捷方式图片和已保存主题保留在本地，不会同步。
- 从 11 种搜索预设中选择，或填写自定义搜索模板。
- 在本地导入 Infinity 新标签页备份，预览支持的内容后追加或替换，并可一步撤销；跳过 Infinity 远程图片。
- 全新安装提供八个可编辑网站及内置图标；未修改的初始网站可在设置中移除。
- 授予可选书签权限后，导入所选浏览器书签文件夹。
- 选择自动网站图标、品牌图标、Lucide 图标、文字、表情或自己的图片。自动图标使用浏览器、网站自身或内置的已知官方来源，并保存在独立的限时缓存中。
- 支持简体中文和英文界面，并提供独立的桌面 Firefox 构建。

Promptab 将数据保存在浏览器管理的扩展存储中，不提供 Promptab 账号、广告 SDK、分析或由开发者运营的应用服务器。打开画廊时会从 zanderh-code.github.io 获取索引和选中的主题包。使用直接 AI 功能时，所选服务商会收到提示、模型和 API 密钥；Open-Meteo 会收到天气查询所需的城市或坐标；浏览器同步服务会处理你选择同步的数据。搜索服务和快捷方式网站会在你使用时收到相应请求。自动图标会在后台探测，并可能通过浏览器 favicon 服务请求图标，也会从快捷方式网站自身的 origin 请求标准图标路径（`/apple-touch-icon.png`、`/apple-touch-icon-precomposed.png`、`/favicon.svg`、`/favicon-32x32.png`、`/favicon.ico`）；对于内置清单中的少量已知网站，还可能请求其官方图标网址，这些网址可能位于网站自身 origin 或 CDN（例如 Google gstatic、Microsoft onecdn、TradingView static、CoinMarketCap static），相应网站或 CDN 可观察到这些访问。部分已知网站直接使用内置品牌图标，不会发出请求。图标结果按网站写入独立本地缓存：最佳结果和品牌结果保留 7 天，失败保留 1 小时；不进入配置文件、备份或同步；带产品路径的网站（如 Google Maps）使用单独条目。壁纸和快捷方式图片文件保存在本地；Promptab 不会获取远程壁纸或快捷方式图片网址。

## Support and privacy

Privacy policy: https://zanderh-code.github.io/promptab/privacy/

The project is released under the MIT License. Bundled dependencies retain their respective licenses; see `licenses/THIRD_PARTY_NOTICES.md` in the source repository. Update the published privacy policy to match the final release before submission.
