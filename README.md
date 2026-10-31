# Minimal New Tab

一个正在开发中的 Edge 新标签页扩展。需要 Node.js 22 和 npm。

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

在 Edge 打开 `edge://extensions`，启用开发人员模式，选择“加载解压缩的扩展”，然后选择项目的 `dist` 文件夹。浏览器可能会要求确认新标签页更改。扩展申请 `storage` 和 `favicon` 权限，后者用于读取浏览器缓存的网站图标；缓存不可用时会向网站请求其 `/favicon.ico`，因此网站可能收到连接请求。设置保存在浏览器本地存储中。卸载扩展可能删除其本地数据。

目前已实现时钟、搜索、快捷方式管理（自动识别网站图标、拖拽排序）、布局与外观自定义、本地壁纸、右键菜单和中英文界面。备份导出/导入仍在开发中；不要依赖当前版本保存无法替代的数据。
