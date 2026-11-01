# Promptab

[English](README.md) | 简体中文

**想要什么样，就跟 AI 说什么样。**

用你已经在用的任何 AI（ChatGPT、Claude、Kimi、DeepSeek 等）设计新标签页。不需要 Promptab 账号、API key 或额外 AI 额度。修改可以预览、随时撤销，数据只保存在这台设备。

<!-- 演示录制后放在 docs/assets/demo.gif。 -->

## 功能

- 时钟、日期、搜索、问候语等可配置组件，提供布局模板和可编辑的组件区域
- 网站快捷方式支持分组、拖拽排序、浏览器书签导入，以及自动识别、图片或文字图标
- 预设主题、颜色、字体、形状、自定义 CSS 和本地壁纸
- 多个配置档、撤销历史、JSON 备份和 nightTab 导入
- 使用自己的 AI 助手，通过 AI 工作台创建、校验、预览和分享主题包
- 中文和英文界面

在「设置 → 数据 → 导出备份」保存配置，并在卸载前将备份保存在浏览器之外。导入时会先校验备份，再覆盖当前配置。

## 在 Edge 中安装

安装 Node.js 22 和 npm，然后在项目目录运行：

```bash
npm install
npm run build
```

打开 `edge://extensions`，启用开发人员模式，选择「加载解压缩的扩展」，然后选择项目的 `dist` 文件夹。如果浏览器询问，请确认新标签页更改。更新源代码后，重新构建并重新加载扩展。

## 五分钟用 AI 制作主题

1. 打开新标签页，进入「设置 → AI」。可以先描述想要的风格，也可以开启「附带我当前的主题和 CSS（不含书签）」。
2. 点击「复制提示包」，粘贴给你自己的 AI 助手。扩展不会替你联系 AI；你发送的内容受所用服务条款约束。可选的当前配置不含书签，但分享前请检查你的需求和自定义 CSS。
3. 把 AI 的整段回复粘贴到「AI 的回复」，也可以选择 `.json`、`.css` 或 `.md` 文件。如果识别出多个代码块，选择其中一个。
4. 查看自动修正和提醒。如果有错误，点击「复制错误给 AI」，发回给助手，再粘贴修正后的回复。选择要应用的部分，点击「预览」和「应用」。预览在应用前不会保存；应用后可以撤销。

对话示例（提示包会提供格式和规则）：

> **你：** 做一个温暖的纸张风格页面，使用衬线时钟和柔和的陶土色强调色。保留我的布局和书签。
>
> **AI：** 这是一个使用暖纸色的浅色主题。

```json
{
  "kind": "mnt.theme-pack",
  "packVersion": 2,
  "theme": {
    "mode": "light",
    "colorLight": {
      "bg": "#f3ecdf",
      "surface": "#faf5ea",
      "text": "#2f2a24",
      "accent": "#9a4a28"
    },
    "font": { "display": "cormorant", "ui": "system" },
    "radius": 6
  }
}
```

将包含 JSON 代码块的完整回复复制到工作台。此示例只修改主题。更多示例和字段参考见 [AI 文档](docs/ai/llms.txt)和[主题包示例](docs/ai/examples/)。

## 开发

```bash
npm install
```

```bash
npm run dev
```

```bash
npm run test -- --run
```

```bash
npm run build
```

## 浏览器检查

构建后启动生产预览：

```bash
npm run preview
```

在另一个终端首次安装 Chromium，然后执行测试：

```bash
npx playwright install chromium
```

```bash
npm run test:e2e
```

测试固定时钟并比对 `e2e/baselines/` 中四种窗口尺寸的截图，也检查备份往返、无效及取消导入、语言切换和下拉菜单主题色。基线在 Windows Chromium 下生成；其他平台的字体渲染可能不同。

## 权限与数据

扩展申请 `storage`、`unlimitedStorage` 和 `favicon` 权限。`unlimitedStorage` 供本地配置档和历史使用，避免触及 Chrome 的标准本地存储配额；`favicon` 用于读取浏览器缓存的网站图标；缓存不可用时会向网站请求其 `/favicon.ico`，因此网站可能收到连接请求。导入浏览器书签时会请求可选的 `bookmarks` 权限。设置保存在浏览器本地存储中，卸载扩展可能删除其本地数据。

## 许可证

Minimal New Tab 使用 [MIT 许可证](LICENSE) 发布。第三方运行时依赖仍遵循各自许可证，详见[第三方声明](licenses/THIRD_PARTY_NOTICES.md)。
