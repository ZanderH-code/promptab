# 极简浏览器桌面：产品与实施计划

日期：2026-10-31  
项目暂名：Minimal New Tab（名称可调整）

## 目标

为 Microsoft Edge 创建一个极简、有质感、可高度自定义且以本地数据为主的新标签页扩展，让用户把常用网站和组件组织成自己的浏览器桌面。

## 架构

采用 Chromium Manifest V3 扩展，通过 `chrome_url_overrides.newtab` 加载本地构建的页面。桌面由可配置的快捷方式、组件和外观设置组成；配置保存在 `chrome.storage.local`，本地壁纸文件保存在 IndexedDB，导入导出包含版本信息与本地图片资源。先支持 Edge，再验证 Chrome；Firefox 兼容留到后续阶段。

配置界面作为页面内的设置抽屉，编辑模式下才显示布局控制；桌面与编辑器共享同一套状态和校验逻辑。首版离线可用，不要求账号或服务器；联网只发生在用户访问网站或使用自选网络资源时。

## 技术栈

- React、TypeScript、Vite：构建交互界面和静态扩展页面。
- CSS 自定义属性与原生 CSS：主题、视觉层次和响应式布局。
- `@dnd-kit/core`、`@dnd-kit/sortable`：快捷方式拖拽排序；提供键盘操作。
- `idb`：封装 IndexedDB 中的用户壁纸存储。
- Vitest、Testing Library：配置校验、迁移与关键交互测试。
- npm：依赖管理与构建；具体版本实施时固定并提交锁文件。

## GitHub 项目调研

| 项目 | 借鉴点 | 许可证与使用边界 |
| --- | --- | --- |
| [nightTab](https://github.com/zombieFox/nightTab) | 自定义排列、颜色、背景和书签，适合参考桌面设置的覆盖范围。 | GPL-3.0；借鉴交互思路，直接复用代码前须核对许可证义务。 |
| [Anori](https://github.com/OlegWock/anori) | 组件和文件夹组织、主题切换，适合参考可扩展组件模型。 | 当前仓库标示 AGPL-3.0，部分历史版本许可证不同；复用前须核对具体版本。 |
| [Tabliss](https://github.com/joelshepherd/tabliss) | 新标签页中的背景与组件组合，适合参考轻量化体验。 | GPL-3.0；以产品体验为参考。 |

以上依据仓库公开说明整理；没有验证其内部实现、性能或近期维护状态。计划独立实现，后续若引入代码、图片或字体，先核实对应版本许可证和署名要求。

## 产品设计

### 视觉方向

- 默认深色、低饱和背景，辅以柔和的光影、细边框与少量半透明材质；避免过度磨砂和持续动态效果。
- 中央或略偏上的时间与搜索，下面是留白充足的网站图标；设置入口放在边缘，平时保持安静。
- 字体优先使用系统字体，保证中文显示和无需联网；时间、标题和辅助文字形成清晰层次。
- 同时提供浅色主题、减少动画选项，窄窗口自动调整排列；文字对比度和键盘焦点始终可辨。

### 首版功能与验收

1. **搜索**：默认一个搜索引擎；可切换预置引擎或填写带 `{query}` 占位符的自定义搜索地址，正确编码输入。搜索框支持快捷键聚焦，空输入不跳转。
2. **快捷方式**：新增、编辑、删除、拖拽及键盘排序；配置名称、HTTP(S) 地址、颜色和文字图标；列表在重新打开新标签页后保留。确认后才删除。
3. **外观**：深浅色、强调色、背景色或本地图片、遮罩透明度、图标尺寸及列数可调。默认视觉简洁，设置即时预览并保存。
4. **桌面组件**：可显示或隐藏时钟、日期和搜索框；允许切换 12/24 小时制。快捷方式区域支持开关标题和调整对齐方式。
5. **数据管理**：本地保存；导出带版本的 JSON 备份，包含本地图片数据；导入前校验结构、版本、图片大小与类型并显示覆盖确认，失败时保留旧数据。提供恢复默认配置的确认操作。
6. **扩展交付**：构建后可在 Edge 开发者模式加载 `dist`，新标签页正常打开；设置数据与壁纸在重启浏览器后保留。提供安装与卸载说明，并提醒启用后浏览器可能要求确认新标签页更改。

### 后续迭代，不阻塞首版

- 快捷方式文件夹、多桌面和更自由的组件布局。
- 自定义上传图标、更多小组件、壁纸轮换与在线壁纸来源。
- 从浏览器书签或 Infinity 导入：先确认其导出格式与授权范围；书签权限只在功能实际需要时申请。
- 天气、待办与便签；天气服务需明确 API、数据来源和网络请求。
- 跨设备同步、Firefox 兼容、扩展商店发布。同步需单独设计容量、冲突与隐私策略。

## 文件规划

以下均相对于项目根目录；首版实施时创建，计划文档之外当前尚未创建。

- `package.json`、`package-lock.json`：依赖、脚本和锁文件。
- `tsconfig.json`、`tsconfig.node.json`、`vite.config.ts`：TypeScript 和构建配置。
- `index.html`、`public/manifest.json`、`public/icons/`：页面入口、MV3 清单、扩展图标。
- `src/main.tsx`、`src/App.tsx`：应用入口与桌面组合。
- `src/styles/global.css`、`src/styles/theme.css`：基础样式、主题变量及响应式规则。
- `src/model/types.ts`、`src/model/defaults.ts`、`src/model/validate.ts`、`src/model/migrate.ts`：配置类型、默认值、输入校验和版本迁移。
- `src/storage/settings.ts`、`src/storage/wallpapers.ts`、`src/storage/backup.ts`：配置读写、壁纸数据和备份导入导出。
- `src/components/Clock.tsx`、`Search.tsx`、`ShortcutGrid.tsx`、`ShortcutEditor.tsx`、`SettingsDrawer.tsx`：桌面组件及编辑界面。
- `src/hooks/useSettings.ts`：加载与更新配置，处理保存失败。
- `src/test/setup.ts`、`src/**/*.test.ts(x)`：测试环境与对应功能测试。
- `README.md`：环境要求、开发、构建、Edge 安装、备份与权限说明。

## 实施步骤

每一步完成后运行相应检查；如测试或手动验证未通过，先修复再进入下一步。

### 1. 初始化可加载扩展

- 创建 `package.json`、锁文件、TS/Vite 配置、`index.html`、`public/manifest.json`、`src/main.tsx`、`src/App.tsx` 和测试配置。清单使用 MV3、`chrome_url_overrides.newtab`，先只声明实际需要的 `storage` 权限；将清单和静态图标复制到 `dist`。
- 配置 `npm run dev`、`npm run build`、`npm run test`；构建产物包含 `dist/manifest.json` 和入口页面。
- 验证：运行 `npm install`、`npm run build`、`npm run test -- --run`，均成功；在 Edge 的 `edge://extensions` 开启开发人员模式并加载 `dist`，新标签页显示占位页面。

### 2. 建立配置和持久化

- 在 `src/model/` 定义带 `schemaVersion` 的配置与合理默认值，在 `src/storage/settings.ts` 封装 `chrome.storage.local`；`src/hooks/useSettings.ts` 提供加载、更新与保存错误状态。
- 先为缺失字段、非法 URL、未知版本和损坏数据编写失败测试；实现严格校验与已知版本迁移，读取失败时提示并保留原始数据，不悄悄覆盖。
- 验证：`npm run test -- --run` 通过；Edge 中修改配置、关闭并重开浏览器后数据仍在。

### 3. 完成桌面视觉与基本组件

- 实现 `Clock.tsx`、`Search.tsx`、全局与主题样式，支持时钟格式、日期和搜索显示开关。设置合理的宽屏和窄窗口布局及减少动态效果偏好。
- 先测试搜索 URL 的编码、自定义模板和空值；实现预置与自定义引擎，拒绝非 HTTP(S) 模板。
- 验证：`npm run test -- --run`、`npm run build` 成功；在 Edge 中检查中英文输入、键盘聚焦、深浅色及窄窗口排版。

### 4. 实现快捷方式管理

- 创建 `ShortcutGrid.tsx` 和 `ShortcutEditor.tsx`，支持新增、修改、删除确认、鼠标拖拽和键盘排序；限制网址为 HTTP(S)。
- 先测试新增、非法网址、排序与删除后的配置结果，再实现交互；交互控件提供可访问名称与焦点状态。
- 验证：`npm run test -- --run`、`npm run build` 成功；在 Edge 新标签页中手动测试鼠标和键盘排序、刷新后保留以及链接跳转。

### 5. 完成设置和壁纸

- 实现 `SettingsDrawer.tsx`、主题变量和 `src/storage/wallpapers.ts`；设置变更立即反映到桌面，本地图片按类型和大小限制读取并写入 IndexedDB，保存失败展示错误。
- 为外观值边界和壁纸存储错误编写测试；删除或替换壁纸时只清理不再引用的资源，避免残留及丢失。
- 验证：`npm run test -- --run`、`npm run build` 成功；在 Edge 中分别测试深浅色、遮罩、列数、图片更换与浏览器重启后的恢复。

### 6. 备份、恢复与交付

- 实现 `src/storage/backup.ts`：导出版本化 JSON 与图片数据，导入前完整校验并预览覆盖提示；将图片和配置提交过程设计为可回滚，失败保留旧配置及原壁纸。
- 先测试导入导出往返、损坏 JSON、未知版本、超大图片及写入失败回滚；实现恢复默认配置时的确认。
- 编写 `README.md`：Node 版本、安装/开发/构建命令、Edge 加载步骤、扩展权限、备份恢复和卸载注意事项。
- 验证：`npm run test -- --run`、`npm run build` 成功；在 Edge 中从一套配置导出、修改后导回，确认快捷方式、外观与壁纸恢复；检查离线打开、错误提示、键盘访问与窗口缩放。

## 设计与实施约定

- 先做独立配置的桌面快捷方式，不默认读取浏览器书签、历史记录或联网获取图标，减少权限和外部依赖。
- 默认配置仅使用示例网站，用户可全部修改或删除；不预装推广链接。
- 资源限制及具体尺寸在实现时写入校验代码和设置提示，并覆盖测试；不要将大图直接写入 `chrome.storage.sync`。
- 开发过程中如需改变首版范围或引入收费 API，先记录方案及影响；实际 UI 和安装效果需在 Edge 验证，不能仅凭构建成功判断。
