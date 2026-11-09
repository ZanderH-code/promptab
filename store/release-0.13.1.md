# Promptab 0.13.1 商店发布材料

## What's new — English

- Automatic icons now show the brand mark for any site in the bundled Simple Icons catalogue, matching domain, subdomain, and alias: 96 of 125 common sites in testing, up from 3.
- Brand-mode shortcuts that store only a brand name now draw the mark.
- Sites without a catalogue mark keep the favicon, then the letter.
- Manually chosen icons and their colours are unchanged.
- Brand data loads on demand in small files and adds nothing to startup.
- The AI workbench text loads with the AI workbench, making startup lighter.
- No new permissions are requested.

## 更新内容 — 简体中文

- 自动图标现在会为内置 Simple Icons 图标目录中的网站显示品牌标记，按域名、子域名和别名匹配：测试的 125 个常用网站中有 96 个显示品牌标记（此前为 3 个）。
- 只保存品牌名称的品牌模式快捷方式现在也能绘制对应标记。
- 图标目录中没有对应标记的网站继续使用 favicon，再回退到字母。
- 手动选择的图标及其颜色保持不变。
- 品牌数据按需以小型文件加载，不增加启动负担。
- AI 工作台文本随 AI 工作台一起加载，启动更轻量。
- 未新增任何权限。

## Notes for certification

```text
Promptab replaces the browser's new tab with a customizable dashboard. No Promptab account or login is required. Core features and manual AI copy/paste require no API key. Optional direct AI requests use a key supplied for that session and require the user's own Anthropic or OpenAI key; provider charges may apply.

To test, install the extension and open a new tab. Add shortcuts for github.com, bilibili.com and zhihu.com in automatic icon mode (the default); each tile should show the bundled brand mark. These marks come from files packaged inside the extension, so matching sites make no network request; the network panel shows no icon requests for them. A site without a catalogue mark, such as amazon.com, keeps its favicon and then falls back to the letter. Edit a shortcut and choose a custom image or a manual icon: the chosen icon and its colour stay unchanged. A brand-mode shortcut that stores only a brand name also draws the mark.

Required permissions are storage, unlimitedStorage and Chromium's favicon permission. Optional bookmarks permission is requested only when the user chooses browser bookmark folders. Optional host permissions for Anthropic, OpenAI and Open-Meteo are requested only when the corresponding direct AI or weather action is used. No permission is added in this release.

All executable extension code is packaged. Promptab does not fetch or execute remote code. The extension_pages CSP is: script-src 'self'; object-src 'none'; font-src 'self' data: blob:
```

## 精简版 publish_notes

```text
Automatic icons now show bundled brand marks for 96 of 125 common sites, including GitHub, Bilibili and Zhihu, with no network request; other sites keep the favicon or letter, and manual icons are unchanged. No new permissions. All code is packaged. CSP: script-src 'self'; object-src 'none'; font-src 'self' data: blob:
```

Character count: **320** (including spaces and punctuation; excluding the Markdown code fence).

## Manifest and permission differences from 0.13.0

Compared with `dfde218` (`public/manifest.json`), the only manifest change is `version`: `0.13.0` → `0.13.1`. The required permissions (`storage`, `unlimitedStorage`, `favicon`), optional permission (`bookmarks`), optional host permissions (Anthropic, OpenAI, and Open-Meteo endpoints), and extension pages CSP are unchanged. No new permission is requested.

## Release steps and status

1. Confirm the 0.13.1 release branch is merged into `main`, CI is green, and the listing, screenshots, privacy policy, and permissions are accurate.
2. Confirm Microsoft Partner Center has no newer published version or active submission.
3. Run the existing **Publish Edge Add-on** workflow manually against `main`; keep the default product ID and paste the compact `publish_notes` above. This document does not trigger the workflow.
4. Check the workflow logs and Partner Center submission status. Successful upload/submission is not the same as certification approval or store publication.
5. After approval, verify the public listing, install/update from the store, and check the release version and permissions.

**Status (2026-11-09): 已认证并在商店上线。** The store serves 0.13.1 as of 2026-11-09 (checked 2026-11-09). This supersedes the earlier submission record above.
