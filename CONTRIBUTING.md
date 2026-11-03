# Contributing themes / 投稿主题

## English

1. Use Promptab's AI workbench to copy a prompt pack to an AI assistant. Ask it for a theme; the example prompts in the gallery are suggestions to try, not claims about how a theme was made.
2. Save the resulting `mnt.theme-pack` v2 JSON as `docs/gallery/packs/<lowercase-id>.json`. Include `meta.name`, `meta.author`, `meta.tags` and `meta.prompt` with both `en` and `zh-CN` example prompts.
3. Gallery packs are limited to 64 KiB. They must pass schema, CSS sanitizer and contrast checks, contain no external URLs, and keep the bookmarks widget visible when providing a layout.
4. Run `npm run gallery` to validate the packs and regenerate `docs/gallery/index.json`, then run `npx vite-node scripts/gallery-index.ts --check` and `npx vitest run src/core/gallery/catalog.test.ts scripts/gallery-index.test.ts` before opening a pull request.

## Submit a theme

Submit an original Promptab v2 theme pack as `docs/gallery/packs/<lowercase-kebab-case-id>.json`. Use a short, descriptive name with lowercase ASCII letters, numbers, and hyphens; the ID must match the filename. Include the pack metadata and a concise English example prompt. Keep the JSON under 64 KiB, retain visible bookmarks, and pass the schema, CSS sanitizer, and contrast checks with `npx vite-node scripts/gallery-index.ts --check` and `npx vitest run src/core/gallery/catalog.test.ts scripts/gallery-index.test.ts`.

Include an original 1280×800 PNG preview at `docs/gallery/previews/<id>.png`. The screenshot should show the theme running in Promptab, use only assets you created or are licensed to redistribute, and avoid personal data. By submitting a pack, you confirm that your contribution is original or that you have the rights needed to contribute it, and you license the pack and its preview image under the MIT License. Do not copy another product's theme, layout artwork, or copyrighted images.

Open a pull request with the pack, preview image, and regenerated `docs/gallery/index.json`. The theme submission issue form can be used to propose a pack before opening a pull request.

## 简体中文

1. 在 Promptab 的 AI 工作台复制提示包，交给你使用的 AI 并请它设计主题。画廊里的提示是可供尝试的例句，不代表主题一定由该句生成。
2. 将生成的 `mnt.theme-pack` v2 JSON 保存为 `docs/gallery/packs/<小写标识>.json`。`meta` 中填写 `name`、`author`、`tags` 和包含 `en`、`zh-CN` 两种示例提示的 `prompt`。
3. 画廊主题包上限为 64 KiB。主题必须通过 schema、CSS 安全检查和对比度检查，不得含外部网址；提供布局时必须保持网站组件可见。
4. 运行 `npm run gallery` 校验主题并重新生成 `docs/gallery/index.json`。运行 `npm test -- --run src/core/gallery/catalog.test.ts`，在 PR 中同时提交主题包和更新后的索引。
