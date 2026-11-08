# Promptab Privacy Policy

**Effective date: 2026-11-02**

Promptab is a browser new-tab extension. It is designed to keep user data in the browser and does not include an account system, advertising SDK, analytics, telemetry, or a remote application server.

## Data stored on your device

The extension stores its settings and preferences (including keyboard shortcuts and accent behavior), profiles, bookmarks/shortcuts, layout and theme choices, custom CSS, saved and imported themes, and locally added images or fonts in browser-managed storage. These features do not contact a Promptab service. Saved themes remain local and are not part of Browser Sync. If you enable Browser Sync, profile preferences are included in the data sent to your browser's sync service.

The separately hosted web version has its own browser-local storage and IndexedDB. Its data is separate from extension storage, even in the same browser, and neither version sends saved settings to a Promptab server. Browser Sync and browser-bookmark import depend on extension APIs and are unavailable in the web version.

## Optional browser-bookmark access

The extension declares the `bookmarks` permission as optional. It requests that permission only when you choose the browser-bookmark import action. If you grant it, the extension reads the browser bookmark tree to show selectable folders and copies the folders and links you choose into the extension's own local profile. It does not continuously monitor bookmarks. If you decline, bookmark import is unavailable and the rest of the new-tab experience remains usable.

## Network requests and navigation

The extension does not operate a general background data-collection channel. Network activity can still occur as a direct result of features you use:

- When automatic website icons are enabled, icon discovery runs in the background with at most three concurrent image requests. Chromium can use the browser's extension favicon endpoint (`/_favicon/`, through the browser favicon API). Other candidates are requested from the shortcut site's own origin: `/apple-touch-icon.png`, `/apple-touch-icon-precomposed.png`, `/favicon.svg`, `/favicon-32x32.png`, and `/favicon.ico`. Before making any request, Promptab checks a bundled domain index built from the Simple Icons catalogue; when the shortcut's site matches, it displays the bundled brand mark from files packaged inside the extension, without making a network request. For a small bundled list of known sites, Promptab may also request the official icon URLs listed in that list, which can be on the site's own origin or on a CDN such as Google gstatic, Microsoft onecdn, TradingView static, or CoinMarketCap static hosts. These requests tell the relevant website or CDN that an icon was requested. The best result, a brand result, or a failure is cached separately per site under `mnt.iconCache:v3` in `localStorage` (success: 7 days; a stale success may still be shown while it is revalidated for up to 30 days; failures retry after 1 hour, then 6 hours, then daily). A fresh cache entry is shown without new requests. Existing `mnt.iconCache:v2` entries in extension `storage.local` are migrated once. Sites with a product path, such as Google Maps, keep a separate entry for that path. This cache is not part of profiles, backups, or sync. A custom image or manually selected icon mode avoids automatic icon discovery.
- When you submit a search, the browser navigates to the search URL template configured in your settings. Your query is sent to the search provider you selected, under that provider's privacy policy.
- When you open a shortcut, the browser navigates to that website. The destination receives the request according to its own policies.
- The optional weather widget contacts Open-Meteo only after you click a weather action. City search sends the city name to `https://geocoding-api.open-meteo.com/*`. Loading weather sends the selected city's coordinates, or coordinates from a one-time location request, to `https://api.open-meteo.com/*`. Current location is requested only after you click the location button; the extension does not track location in the background. Weather responses are cached locally for at least 30 minutes and may be shown with their last-updated time when offline.

When you enable Browser Sync in Settings, the extension writes profile preferences, shortcut/group data, theme settings, profile layout and update metadata to the browser's `storage.sync` API. This includes keyboard-shortcut and accent-on-open preferences. Your browser's sync service processes that data for your signed-in browser account under its provider's terms. Saved themes, wallpaper images and video, uploaded fonts, and bookmark images remain local and are not included. Sync is off by default; turning it off stops synchronization on that device. You can separately remove Promptab's browser sync data. The extension does not send these sync records to a Promptab server.

The extension does not sell personal information or use these direct feature requests for its own analytics.

## Backups, exports, and AI features

Infinity New Tab backups are parsed locally after you choose a file. Promptab does not upload the backup or download its remote images and cloud wallpapers. Fresh installs include editable starter sites with bundled icons; displaying them does not contact their websites.

Backup and export actions create files or copied data only when you request them. The AI workbench prepares and validates theme/profile data locally. You can copy a prompt to an AI service yourself, or optionally send it directly using your own Anthropic or OpenAI API key. Direct sending requests optional access to the selected provider's fixed origin, `https://api.anthropic.com/*` or `https://api.openai.com/*`, when you click send. It sends the prompt, selected model and API key directly to that provider. Anthropic browser requests include `anthropic-dangerous-direct-browser-access: true`; OpenAI requests use bearer authentication. The prompt includes your request and does not automatically include your current theme, CSS or bookmarks; anything you enter in your request is included. The key is held only in active page session memory and is not written to browser storage or uploaded to Promptab; it is cleared when the page session ends. Provider privacy policies and charges apply; API use may incur fees. Provider replies are placed in the workbench for local validation.

## Web version storage and network behavior

The web app stores settings in that site's local storage and larger assets in browser-local IndexedDB. This store is separate from extension storage. To migrate a setup between the web app and extension, export a backup through **Settings → Data → Export backup**, then import the file in the other version. Import validates the backup before applying it. Backups remain under your control.

The web app has no extension APIs, so Browser Sync and browser-bookmark import are unavailable. The app can contact services when you use their features: the GitHub Pages host for the theme gallery and selected packs; Open-Meteo for city searches and weather after you request it; search providers and shortcut sites when you open their URLs; and Anthropic or OpenAI when you choose direct BYOK sending. The web BYOK request goes directly from your browser to the selected provider, including Anthropic's `anthropic-dangerous-direct-browser-access: true` header for Anthropic requests. Provider terms, privacy policies and charges apply. The site host serves the static page and assets; it does not receive your saved app settings through a Promptab application server.

## Data deletion

You can remove extension data through the extension's reset or delete controls, or through your browser's extension storage/site-data controls. Uninstalling the extension removes its browser-managed extension storage, subject to the browser's own behavior and any files you exported yourself.

## Changes and contact

This policy may be updated when the extension's data practices change. The repository that distributes Promptab is the source for the current policy and project contact details.

This policy is informational and is not legal advice.

---

## 中文摘要

Promptab 不包含账号、广告 SDK、分析或遥测服务。设置、配置文件、书签/快捷方式、主题、自定义 CSS 以及本地图片和字体保存在浏览器扩展存储中。`bookmarks` 权限为可选权限，仅在你主动选择导入浏览器书签时请求；拒绝后仍可使用其他功能。

浏览器同步默认关闭。启用后，配置偏好（包括键盘快捷键和打开时的强调色行为）、快捷方式/分组、主题设置、布局和更新时间会写入浏览器的 `storage.sync` 接口，由浏览器同步服务根据其提供商的条款为你已登录的浏览器账号处理。已保存主题、壁纸、视频、上传的字体和书签图片仍保存在本地，不会同步。关闭同步只会停止当前设备的同步；你可以另行删除 Promptab 的同步数据。扩展不会把同步记录发送到 Promptab 服务器。

AI 工作台可以手动复制提示包，也可以使用你自己的 API 密钥直接发送给 Anthropic 或 OpenAI。点击发送时会请求所选服务商域名的可选访问权限，并向其发送提示包、模型和密钥；提示包包含你的需求，不会自动附带当前主题、CSS 或书签；你在需求中输入的内容会被包含。密钥仅保留在当前页面会话内存中，不写入浏览器存储，也不会上传给 Promptab；页面会话结束后即被清除。Anthropic 浏览器直连请求会带有 `anthropic-dangerous-direct-browser-access: true` 请求头。服务商的隐私政策和收费标准适用，API 使用可能产生费用。

网页版将设置保存在网站本地存储中，并将较大的资源保存在浏览器本地 IndexedDB 中，与扩展存储分开。可通过「设置 → 数据 → 导出备份」再在另一个版本中导入来迁移配置。网页版不支持依赖扩展 API 的浏览器同步和浏览器书签导入。使用画廊、天气、搜索、快捷方式或 BYOK 时，浏览器会直接联系相应的网站或服务提供商；提供商条款和隐私政策适用。

Infinity 新标签页备份在你选择文件后仅在本地解析，不上传备份，也不下载其中的远程图片或云端壁纸。全新安装提供可编辑的初始网站和内置图标，展示时不会联系对应网站。

启用自动网站图标后，图标探测会在后台进行，并发图片请求最多为 3 个。Chromium 可使用浏览器 favicon 接口；其他候选会从快捷方式网站自身的 origin 请求：`/apple-touch-icon.png`、`/apple-touch-icon-precomposed.png`、`/favicon.svg`、`/favicon-32x32.png` 和 `/favicon.ico`。在发出任何请求之前，Promptab 会先查询由 Simple Icons 图标目录生成的内置域名索引；如果快捷方式对应的网站匹配，就直接显示打包在扩展内的品牌图标，不发出网络请求。对于内置清单中的少量已知网站，Promptab 还可能请求该清单列出的官方图标网址；这些网址可能位于网站自身的 origin，也可能位于 Google gstatic、Microsoft onecdn、TradingView static、CoinMarketCap static 等 CDN 主机。这些请求会让相应网站或 CDN 知道有人请求了图标。每个网站的最佳结果、品牌结果或失败结果会按 `mnt.iconCache:v3` 单独缓存在 `localStorage`（成功 7 天；过期成功结果可在最多 30 天内继续显示并在后台重新验证；失败后依次等待 1 小时、6 小时、24 小时再重试）。命中新鲜缓存时不会发出新请求。扩展 `storage.local` 中的旧 `mnt.iconCache:v2` 条目会一次性迁移。带产品路径的网站（例如 Google Maps）会为该路径使用单独条目。缓存不属于配置文件、备份或同步数据。自定义图片或手动选择的图标模式不会启动自动图标探测。搜索提交会把查询发送到你配置的搜索服务，打开快捷方式会访问对应网站。壁纸和快捷方式图片在本地管理，不会从远程网址获取。可选天气组件只在你点击相关操作后联系 Open-Meteo：城市搜索会发送城市名称，加载天气会发送所选城市坐标或一次性定位得到的坐标。只有点击定位按钮后才请求当前位置，不会在后台持续跟踪。天气结果至少在本地缓存 30 分钟，离线时可以显示缓存和更新时间。这些请求由你主动使用的功能触发，并受目标服务的隐私政策约束。扩展本身不通过这些请求进行分析或出售个人信息。
