# Minimal New Tab Privacy Policy

**Effective date: 2026-11-01**

Minimal New Tab is a browser new-tab extension. It is designed to keep user data in the browser and does not include an account system, advertising SDK, analytics, telemetry, or a remote application server.

## Data stored on your device

The extension stores its settings, profiles, bookmarks/shortcuts, layout and theme choices, custom CSS, imported theme data, and locally added images or fonts in the browser's extension storage. It may use the `unlimitedStorage` permission so larger profiles and locally stored assets can be retained. Browser storage is used locally; the project does not send this stored data to a developer-operated service.

When the extension is running outside an extension context for development or preview, it can use the page's local storage instead. That behavior is for the local web app and does not create a remote account or telemetry channel.

## Optional browser-bookmark access

The extension declares the `bookmarks` permission as optional. It requests that permission only when you choose the browser-bookmark import action. If you grant it, the extension reads the browser bookmark tree to show selectable folders and copies the folders and links you choose into the extension's own local profile. It does not continuously monitor bookmarks. If you decline, bookmark import is unavailable and the rest of the new-tab experience remains usable.

## Network requests and navigation

The extension does not operate a general background data-collection channel. Network activity can still occur as a direct result of features you use:

- When a shortcut uses automatic website icons, the extension first uses the browser's extension favicon endpoint (`/_favicon/`, through the browser favicon API) where available. Its fallback requests the shortcut site's origin at `/favicon.ico`. Those requests can reveal the relevant URL to the browser and, for the fallback, to that website's server. A custom icon or manually selected icon mode can avoid these favicon requests.
- When you submit a search, the browser navigates to the search URL template configured in your settings. Your query is sent to the search provider you selected, under that provider's privacy policy.
- When you open a shortcut, the browser navigates to that website. The destination receives the request according to its own policies.
- If you choose a remote wallpaper or import a remote image into a shortcut, the browser fetches that URL so the image can be displayed and stored locally. The remote host may receive the request.

The extension does not sell personal information or use these direct feature requests for its own analytics.

## Backups, exports, and AI features

Backup and export actions create files or copied data only when you request them. The extension's AI workbench prepares and validates theme/profile data locally; it does not contain a built-in AI network client. If you copy generated content into another AI service yourself, that service's policy applies.

## Data deletion

You can remove extension data through the extension's reset or delete controls, or through your browser's extension storage/site-data controls. Uninstalling the extension removes its browser-managed extension storage, subject to the browser's own behavior and any files you exported yourself.

## Changes and contact

This policy may be updated when the extension's data practices change. The repository that distributes Minimal New Tab is the source for the current policy and project contact details.

This policy is informational and is not legal advice.

---

## 中文摘要

Minimal New Tab 不包含账号、广告 SDK、分析或遥测服务。设置、配置文件、书签/快捷方式、主题、自定义 CSS 以及本地图片和字体保存在浏览器扩展存储中。`bookmarks` 权限为可选权限，仅在你主动选择导入浏览器书签时请求；拒绝后仍可使用其他功能。

自动网站图标会优先使用浏览器的 favicon 接口，并可能回退请求相应网站 origin 的 `/favicon.ico`。搜索提交会把查询发送到你配置的搜索服务，打开快捷方式会访问对应网站；远程壁纸或远程图片导入也会向相应地址发起请求。这些请求由你主动使用的功能触发，并受目标服务的隐私政策约束。扩展本身不通过这些请求进行分析或出售个人信息。
