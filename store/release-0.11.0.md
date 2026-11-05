# Promptab 0.11.0 商店发布材料

## What's new — English

- Choose from eleven search presets, including Brave Search, Startpage, Ecosia, Qwant, Kagi, and Perplexity, or keep using a custom search template.
- Import an Infinity New Tab backup locally, preview supported links, search engines, Todo and Note content, and add or replace imported sections with one-step undo.
- Fresh installs start with eight editable sites and embedded icons. Remove unchanged starter sites in Settings, with undo.
- Use the redesigned keyboard shortcuts dialog, with keyboard navigation and restored focus.

## 更新内容 — 简体中文

- 从 11 种搜索预设中选择，包括 Brave Search、Startpage、Ecosia、Qwant、Kagi 和 Perplexity；仍可使用自定义搜索模板。
- 在本地导入 Infinity New Tab 备份，预览支持的链接、搜索引擎、待办和便签内容，选择追加或替换，并可一步撤销。
- 全新安装提供八个可编辑的初始网站和内置图标；可在设置中移除未修改的初始网站，并可撤销。
- 快捷键对话框焕新，支持键盘操作并在关闭后恢复焦点。

## Notes for certification

```text
Promptab replaces the browser's new tab with a customizable dashboard. No Promptab account, login, or API key is required for the core features or the manual theme workflow. No reviewer credentials are required. Browser sync is optional and uses the browser's own signed-in sync service. Direct AI requests are optional and require the reviewer's own Anthropic or OpenAI API key; provider charges may apply.

To test:
1. Install the extension and open a new tab. On a fresh installation, the dashboard starts with eight editable sites. Open Settings to change the layout, theme, and search engine; eleven search presets and a custom template are available.
2. In Settings, use Import from Infinity New Tab and choose a local Infinity v2 .infinity or JSON backup, if available. Preview the supported items, then add or replace the imported sections. Undo restores the previous profile. This test needs a user-supplied backup; the file is parsed locally and remote Infinity images are not downloaded.
3. Open the keyboard shortcuts dialog, navigate it with the keyboard, and dismiss it. Focus returns to the control that opened it.
4. To test bookmark import, choose the browser bookmark import option in Settings and select Choose folders. The optional bookmarks permission is requested at that action. If granted, select folders and import them; denying it does not block the rest of the extension.
5. To test weather, use a city search or load a forecast in the weather feature. The relevant optional Open-Meteo host permission is requested when that action is initiated. Firefox also requests the optional locationInfo data-collection permission.
6. To test direct AI theme generation, enter your own provider API key and send a request to Anthropic or OpenAI. The selected provider's optional host permission is requested when Send is used. Firefox also requests the optional authenticationInfo and personalCommunications data-collection permissions. Alternatively, use the manual copy-and-paste theme workflow without a key or host permission.

Required permissions are storage and unlimitedStorage for profiles, settings and local assets; the Chromium build also requires favicon for browser-provided site icons. Bookmarks and the four provider/weather hosts are optional and requested only when the corresponding feature is used. Firefox omits favicon and declares no required data-collection categories.

All executable extension code is packaged with the extension; Promptab does not fetch or execute remotely hosted code. The public theme gallery fetches an index and selected theme packs as data; theme packs contain data and restricted CSS, not executable JavaScript. Optional AI and weather requests exchange data with the chosen services.

The extension_pages Content Security Policy in the Chromium manifest is exactly:
script-src 'self'; object-src 'none'; font-src 'self' data: blob:
```

## Listing、截图和隐私链接

- **Listing：需要更新商店字段。** 仓库的 `store/listing.md` 已包含 0.11.0 的中英文功能介绍和权限披露；将对应内容及上面的双语 What's new 填入各商店，核对实际已发布字段和长度限制。Firefox 文案适用于独立桌面构建，最低版本 140，不宣称支持 Firefox Android。
- **截图：建议更新默认主页截图，其余按展示内容核对。** `store/screenshots/` 有七张英文截图；`01-default` 是使用三个测试快捷方式的定制示例，并非包含八个初始网站的全新安装画面，应重拍或明确标注。`05-ai` 使用本地画廊主题包演示粘贴预览，`06-widgets-weather` 使用模拟天气数据；不要将其描述为真实服务请求。提交前检查当前商店尺寸、数量及线上素材。
- **隐私链接：URL 无需更换，政策内容需要核对并按需更新。** Listing、README 和设置页均指向 <https://zanderh-code.github.io/promptab/privacy/>。确认线上页面已部署且覆盖最终包的数据处理；仓库公开页面 `docs/privacy/index.html` 披露扩展画廊请求，但 `store/privacy-policy.md` 仅在网页版段落明确提及画廊。公开页面将同步服务写作 Chrome/Google，Firefox 构建也使用浏览器同步，应协调两份政策并核对线上内容。线上页面和商店当前内容尚未验证。

## Manifest 差异与权限影响

以下比较针对 `git show a70f71b:public/manifest.json`、`git show 6bca0f0:public/manifest.json` 与当前 `public/manifest.json`，并非对商店实际已发布包的确认。

| 字段 | `a70f71b` | `6bca0f0` | 当前 |
| --- | --- | --- | --- |
| `version` | `0.9.0` | `0.10.0` | `0.11.0` |
| `optional_host_permissions` | 未声明 | 未声明 | `https://api.anthropic.com/*`、`https://api.openai.com/*`、`https://api.open-meteo.com/*`、`https://geocoding-api.open-meteo.com/*` |

除上述版本号和新增的四个可选主机外，两个历史 manifest 相对当前文件没有其他差异。必需权限均为 `storage`、`unlimitedStorage`、`favicon`，可选权限均为 `bookmarks`；CSP 均为 `script-src 'self'; object-src 'none'; font-src 'self' data: blob:`。

相对于这两个历史提交，新增的可选主机权限可能触发浏览器重新授权或商店额外审核；实际提示和更新行为取决于浏览器、已授予权限及商店中实际已发布版本。主机权限在用户主动发送 AI 请求或使用天气功能时申请，而非核心功能的使用前提。Firefox 构建另移除 `favicon`，声明必需数据收集类别 `none`，并在相应操作时申请可选的 `authenticationInfo`、`personalCommunications` 或 `locationInfo`。提交前应核对最终安装包、真实权限提示和各商店要求。
