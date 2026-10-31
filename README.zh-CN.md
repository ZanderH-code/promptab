# Minimal New Tab

[English](README.md) | 简体中文

一个安静、可自定义的 Edge（Chromium，Manifest V3）新标签页扩展。需要 Node.js 22 和 npm。仍在开发中。

## 功能

- 时钟、日期和搜索框
- 快捷方式：自动识别网站图标，也支持本地图片和文字图标，可拖拽排序
- 可自定义布局（上下排列或左右分区）、列数、图标大小、图标形状和对齐方式
- 本地壁纸，遮罩浓度可调
- 组件和背景支持右键菜单
- 中文和英文界面
- 完整 JSON 备份导出/导入，包含设置、网站、本地图标和壁纸

在「设置 → 数据」选择「导出备份」保存文件；选择「导入备份」后，系统先校验文件，再显示网站数量、壁纸状态和导出时间，确认后才覆盖当前配置。壁纸支持 PNG、JPEG、WebP，最大 5 MB。写入失败时会尝试恢复原有设置和壁纸。卸载扩展前请将备份保存在浏览器之外。

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

## 在 Edge 中加载

打开 `edge://extensions`，启用开发人员模式，选择“加载解压缩的扩展”，然后选择项目的 `dist` 文件夹。浏览器可能会要求确认新标签页更改。

## 权限与数据

扩展申请 `storage`、`unlimitedStorage` 和 `favicon` 权限。`unlimitedStorage` 供本地配置档和历史使用，避免触及 Chrome 的标准本地存储配额；`favicon` 用于读取浏览器缓存的网站图标；缓存不可用时会向网站请求其 `/favicon.ico`，因此网站可能收到连接请求。设置保存在浏览器本地存储中，卸载扩展可能删除其本地数据。
