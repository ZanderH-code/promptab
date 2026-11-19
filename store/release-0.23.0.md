# Promptab 0.23.0 商店发布材料

0.22.0 was submitted to Edge Add-ons on 2026-11-19. 0.23.0 is an optimization pass: a clearer AI panel, interface motion, a smaller package and many fixes.

## What's new — English

- The AI panel now works in three steps: describe the look (with style ideas), have an AI write it (copy the prompt into any AI chat, or generate with your own API key), then review, preview and apply. You can ask the AI for changes or fixes afterwards.
- The AI builds on your current page: the prompt includes a short outline of it (no website names or addresses) and, unless you untick it, your current theme and CSS.
- Gentle interface motion: overlays fade in, tiles respond when pressed, the settings drawer slides in and theme previews cross-fade. It follows your system's reduce-motion setting.
- A package about 5 MB smaller, and fixes for CSS safety checks, settings saving, browser sync, first run and several display details.
- No new permissions.

## 更新内容 — 简体中文

- AI 面板改为三步：描述想要的样子（附风格灵感），让 AI 生成（把提示包复制到任意 AI 聊天，或用自己的 API 密钥直接生成），再检查、预览并应用。生成后还可以让 AI 继续修改或修正问题。
- AI 会在你当前的页面基础上修改：提示包附带页面的简要情况（不含网站名称或地址），并默认附带当前主题和 CSS（可取消勾选）。
- 新增柔和的界面动效：弹窗淡入、按下网站有反馈、设置面板滑入、主题预览渐变过渡；会遵循系统的「减弱动态效果」设置。
- 安装包缩小约 5 MB，并修复了 CSS 安全检查、设置保存、浏览器同步、首次运行和多处显示问题。
- 未新增任何权限。

## Notes for certification

```text
Promptab replaces the browser's new tab with a customizable dashboard. No Promptab account or login is required. Core features and manual AI copy/paste require no API key. Optional direct AI requests use a key supplied for that session and require the user's own Anthropic or OpenAI key; provider charges may apply.

To test 0.23.0, open a new tab, open Settings → AI assistant. Type a description or click a style idea, choose "Use an AI chat I already have", click "Copy prompt" and paste it into any AI chat; paste the reply back into the box below. Promptab checks it, previews it, and "Apply" keeps it (Undo is available). Open and close menus and Settings to see the motion; the operating system's reduce-motion setting turns it off.

Required permissions are storage, unlimitedStorage and Chromium's favicon permission. Optional bookmarks permission is requested only when the user chooses browser bookmark folders. Optional host permissions for Anthropic, OpenAI and Open-Meteo are requested only when the corresponding direct AI or weather action is used. No permission is added in this release.

All executable extension code is packaged. Promptab does not fetch or execute remote code. The extension_pages CSP is: script-src 'self'; object-src 'none'; font-src 'self' data: blob:
```

## 精简版 publish_notes

```text
Three-step AI panel, interface motion that follows Reduce motion, smaller package, CSS safety, settings and sync fixes. AI prompt now includes a page outline (no names/URLs); privacy policy updated. No new permissions. All executable code is packaged. CSP: script-src 'self'; object-src 'none'; font-src 'self' data: blob:
```

## Manifest and permission differences from 0.22.0

The only manifest change is `version`: `0.22.0` → `0.23.0`. Permissions, optional permissions, optional host permissions and CSP are unchanged.

## Privacy

Updated (`store/privacy-policy.md`, `docs/privacy/index.html`, English and Chinese). The AI prompt the user copies or sends now also holds a short outline of the page (light or dark, background type, layout and widget types; no website names or addresses) and, by default, the current theme and custom CSS; bookmarks, names, addresses and images are never included. The chosen AI method, provider and model name are remembered in localStorage; the API key is not. Nothing new is collected by Promptab, and no data goes to a Promptab server.

## Startup

Startup JavaScript: **443,473 bytes raw**, under the unchanged 480,000-byte budget.

## Store text that must be pasted by hand

Partner Center description, screenshots and the "What's new" text above are not updated by the publish workflow; paste them in Partner Center if desired.
