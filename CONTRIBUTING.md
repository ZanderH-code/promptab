# Contributing themes / 投稿主题

## English

1. Use Promptab's AI workbench to copy a prompt pack to an AI assistant. Ask it for a theme; the example prompts in the gallery are suggestions to try, not claims about how a theme was made.
2. Save the resulting `mnt.theme-pack` v2 JSON as `docs/gallery/packs/<lowercase-id>.json`. Include `meta.name`, `meta.author`, `meta.tags` and `meta.prompt` with both `en` and `zh-CN` example prompts.
3. Gallery packs are limited to 64 KiB, theme/background/CSS fields and local resources. They must pass schema, CSS sanitizer and contrast checks, contain no external URLs, and must not include layout, widgets or variables.
4. Run `npm run gallery` to validate the packs and regenerate `docs/gallery/index.json`. Run `npm test -- --run src/core/gallery/catalog.test.ts` and include the pack and regenerated index in a pull request.

## 简体中文

1. 在 Promptab 的 AI 工作台复制提示包，交给你使用的 AI 并请它设计主题。画廊里的提示是可供尝试的例句，不代表主题一定由该句生成。
2. 将生成的 `mnt.theme-pack` v2 JSON 保存为 `docs/gallery/packs/<小写标识>.json`。`meta` 中填写 `name`、`author`、`tags` 和包含 `en`、`zh-CN` 两种示例提示的 `prompt`。
3. 画廊主题包上限为 64 KiB，仅接受主题、背景和 CSS 字段及本地资源。主题必须通过 schema、CSS 安全检查和对比度检查，不得含外部网址，也不接受布局、组件或变量字段。
4. 运行 `npm run gallery` 校验主题并重新生成 `docs/gallery/index.json`。运行 `npm test -- --run src/core/gallery/catalog.test.ts`，在 PR 中同时提交主题包和更新后的索引。
