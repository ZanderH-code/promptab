# Promptab Privacy Policy

**Effective date: 2026-11-02**

Promptab is a browser new-tab extension. It is designed to keep user data in the browser and does not include an account system, advertising SDK, analytics, telemetry, or a remote application server.

## Data stored on your device

The extension stores its settings, profiles, bookmarks/shortcuts, layout and theme choices, custom CSS, imported theme data, and locally added images or fonts in the browser's extension storage. It may use the `unlimitedStorage` permission so larger profiles and locally stored assets can be retained. Browser storage is used locally; the project does not send this stored data to a developer-operated service.

The separately hosted web version has its own browser-local storage and IndexedDB. Its data is separate from extension storage, even in the same browser, and neither version sends saved settings to a Promptab server. Browser Sync and browser-bookmark import depend on extension APIs and are unavailable in the web version.

## Optional browser-bookmark access

The extension declares the `bookmarks` permission as optional. It requests that permission only when you choose the browser-bookmark import action. If you grant it, the extension reads the browser bookmark tree to show selectable folders and copies the folders and links you choose into the extension's own local profile. It does not continuously monitor bookmarks. If you decline, bookmark import is unavailable and the rest of the new-tab experience remains usable.

## Network requests and navigation

The extension does not operate a general background data-collection channel. Network activity can still occur as a direct result of features you use:

- When a shortcut uses automatic website icons, the extension first uses the browser's extension favicon endpoint (`/_favicon/`, through the browser favicon API) where available. Its fallback requests the shortcut site's origin at `/favicon.ico`. Those requests can reveal the relevant URL to the browser and, for the fallback, to that website's server. A custom icon or manually selected icon mode can avoid these favicon requests.
- When you submit a search, the browser navigates to the search URL template configured in your settings. Your query is sent to the search provider you selected, under that provider's privacy policy.
- When you open a shortcut, the browser navigates to that website. The destination receives the request according to its own policies.
- If you choose a remote wallpaper or import a remote image into a shortcut, the browser fetches that URL so the image can be displayed and stored locally. The remote host may receive the request.
- The optional weather widget contacts Open-Meteo only after you click a weather action. City search sends the city name to `https://geocoding-api.open-meteo.com/*`. Loading weather sends the selected city's coordinates, or coordinates from a one-time location request, to `https://api.open-meteo.com/*`. Current location is requested only after you click the location button; the extension does not track location in the background. Weather responses are cached locally for at least 30 minutes and may be shown with their last-updated time when offline.

When you enable Browser Sync in Settings, the extension writes only shortcut/group data, theme settings, profile layout and update metadata to the browser's `storage.sync` API. Your browser's sync service processes that data for your signed-in browser account under its provider's terms. Wallpaper images and video, uploaded fonts, and bookmark images remain in local IndexedDB and are not included. Sync is off by default; turning it off stops synchronization on that device. You can separately remove Promptab's browser sync data. The extension does not send these sync records to a Promptab server.

The extension does not sell personal information or use these direct feature requests for its own analytics.

## Backups, exports, and AI features

Backup and export actions create files or copied data only when you request them. The AI workbench prepares and validates theme/profile data locally. You can copy a prompt to an AI service yourself, or optionally send it directly using your own Anthropic or OpenAI API key. Direct sending requests optional access to the selected provider's fixed origin, `https://api.anthropic.com/*` or `https://api.openai.com/*`, when you click send. It sends the prompt, selected model and API key directly to that provider. Anthropic browser requests include `anthropic-dangerous-direct-browser-access: true`; OpenAI requests use bearer authentication. The prompt includes your request and does not automatically include your current theme, CSS or bookmarks; anything you enter in your request is included. The key is held only in active page session memory and is not written to browser storage or uploaded to Promptab; it is cleared when the page session ends. Provider privacy policies and charges apply; API use may incur fees. Provider replies are placed in the workbench for local validation.

## Web version storage and network behavior

The web app stores settings in that site's local storage and larger assets in browser-local IndexedDB. This store is separate from extension storage. To migrate a setup between the web app and extension, export a backup through **Settings → Data → Export backup**, then import the file in the other version. Import validates the backup before applying it. Backups remain under your control.

The web app has no extension APIs, so Browser Sync and browser-bookmark import are unavailable. The app can contact services when you use their features: the GitHub Pages host for the theme gallery and selected packs; Open-Meteo for city searches and weather after you request it; search providers, shortcut sites and image hosts when you open or load their URLs; and Anthropic or OpenAI when you choose direct BYOK sending. The web BYOK request goes directly from your browser to the selected provider, including Anthropic's `anthropic-dangerous-direct-browser-access: true` header for Anthropic requests. Provider terms, privacy policies and charges apply. The site host serves the static page and assets; it does not receive your saved app settings through a Promptab application server.

## Data deletion

You can remove extension data through the extension's reset or delete controls, or through your browser's extension storage/site-data controls. Uninstalling the extension removes its browser-managed extension storage, subject to the browser's own behavior and any files you exported yourself.

## Changes and contact

This policy may be updated when the extension's data practices change. The repository that distributes Promptab is the source for the current policy and project contact details.

This policy is informational and is not legal advice.

---

## 中文摘要

Promptab 不包含账号、广告 SDK、分析或遥测服务。设置、配置文件、书签/快捷方式、主题、自定义 CSS 以及本地图片和字体保存在浏览器扩展存储中。`bookmarks` 权限为可选权限，仅在你主动选择导入浏览器书签时请求；拒绝后仍可使用其他功能。

浏览器同步默认关闭。启用后，快捷方式/分组、主题设置、布局和更新时间会写入浏览器的 `storage.sync` 接口，由浏览器同步服务根据其提供商的条款为你已登录的浏览器账号处理。壁纸、视频、上传的字体和书签图片仍保存在本地 IndexedDB。关闭同步只会停止当前设备的同步；你可以另行删除 Promptab 的同步数据。扩展不会把同步记录发送到 Promptab 服务器。

AI 工作台可以手动复制提示包，也可以使用你自己的 API 密钥直接发送给 Anthropic 或 OpenAI。点击发送时会请求所选服务商域名的可选访问权限，并向其发送提示包、模型和密钥；提示包包含你的需求，不会自动附带当前主题、CSS 或书签；你在需求中输入的内容会被包含。密钥仅保留在当前页面会话内存中，不写入浏览器存储，也不会上传给 Promptab；页面会话结束后即被清除。Anthropic 浏览器直连请求会带有 `anthropic-dangerous-direct-browser-access: true` 请求头。服务商的隐私政策和收费标准适用，API 使用可能产生费用。

网页版将设置保存在网站本地存储中，并将较大的资源保存在浏览器本地 IndexedDB 中，与扩展存储分开。可通过「设置 → 数据 → 导出备份」再在另一个版本中导入来迁移配置。网页版不支持依赖扩展 API 的浏览器同步和浏览器书签导入。使用画廊、天气、搜索、快捷方式、远程图片或 BYOK 时，浏览器会直接联系相应的网站或服务提供商；提供商条款和隐私政策适用。

自动网站图标会优先使用浏览器的 favicon 接口，并可能回退请求相应网站 origin 的 `/favicon.ico`。搜索提交会把查询发送到你配置的搜索服务，打开快捷方式会访问对应网站；远程壁纸或远程图片导入也会向相应地址发起请求。可选天气组件只在你点击相关操作后联系 Open-Meteo：城市搜索会发送城市名称，加载天气会发送所选城市坐标或一次性定位得到的坐标。只有点击定位按钮后才请求当前位置，不会在后台持续跟踪。天气结果至少在本地缓存 30 分钟，离线时可以显示缓存和更新时间。这些请求由你主动使用的功能触发，并受目标服务的隐私政策约束。扩展本身不通过这些请求进行分析或出售个人信息。
