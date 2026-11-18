# Promptab 0.21.0 商店发布材料

0.19.0 is live in Edge Add-ons; 0.20.0 was submitted on 2026-11-18. 0.21.0 makes AI-made themes and custom CSS look good.

## What's new — English

- AI themes come out cleaner: the prompt explains each page element and the common mistakes, so replies no longer box the website area or the search field.
- The AI review flags CSS that applies but looks wrong; "Copy feedback for the AI" sends it back for a fix.
- The custom CSS editor warns about the same mistakes as you type, and its suggestions explain each class.
- Copying the prompt pack opens the reply step.
- No new permissions.

## 更新内容 — 简体中文

- AI 生成的主题更好看：提示包会说明页面上每个元素是什么，并列出常见错误，回复不再把网站区或搜索框框起来。
- AI 校验会指出能应用但显示难看的 CSS，「复制修改意见给 AI」可以把这些问题交给 AI 修改。
- 自定义 CSS 编辑器在输入时提示同样的问题，自动补全会说明每个类名对应的元素。
- 复制提示包后会自动展开粘贴回复的步骤。
- 未新增任何权限。

## Notes for certification

```text
Promptab replaces the browser's new tab with a customizable dashboard. No Promptab account or login is required. Core features and manual AI copy/paste require no API key. Optional direct AI requests use a key supplied for that session and require the user's own Anthropic or OpenAI key; provider charges may apply.

To test 0.21.0, open a new tab, open Settings → Style and type `.mnt-bookmark-tile { border: 1px solid red; }` into Custom CSS: a warning appears under the editor explaining the rule boxes all websites. Then open Settings → AI assistant, paste the same CSS inside a ```css code block as the reply: the review lists the note and "Copy feedback for the AI" copies it.

Required permissions are storage, unlimitedStorage and Chromium's favicon permission. Optional bookmarks permission is requested only when the user chooses browser bookmark folders. Optional host permissions for Anthropic, OpenAI and Open-Meteo are requested only when the corresponding direct AI or weather action is used. No permission is added in this release.

All executable extension code is packaged. Promptab does not fetch or execute remote code. The extension_pages CSP is: script-src 'self'; object-src 'none'; font-src 'self' data: blob:
```

## 精简版 publish_notes

```text
Better-looking AI themes and custom CSS: clearer AI prompt, warnings for CSS that applies but looks wrong, feedback to copy back to the AI. No new permissions, no data-use change. All executable code is packaged. CSP: script-src 'self'; object-src 'none'; font-src 'self' data: blob:
```

## Manifest and permission differences from 0.20.0

The only manifest change is `version`: `0.20.0` → `0.21.0`. Permissions, optional permissions, optional host permissions and CSP are unchanged.

## Privacy

Unchanged. No new data is collected or sent; the privacy policy is not modified.

## Startup

Startup JavaScript: **479,230 bytes raw** (gzip 152,375), under the unchanged 480,000-byte budget.

## Store text that must be pasted by hand

Partner Center description, screenshots and the "What's new" text above are not updated by the publish workflow; paste them in Partner Center if desired.
