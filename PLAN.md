# Promptab：产品与实施计划 v2

## Release status — 0.12.0

M6–M21 are complete. Release preparation for 0.12.0 includes the post-0.11.0 changes merged to main. Main commits:

- 0.12.0 features: bookmark folder dialogs `1d54a24`, Settings tabs wrap and remain visible `3a86c10`, progressive website icon quality `2ee3c50`.
- 0.11.0 release preparation: `6e6f7c3`.

- M6a–f BYOK, wallpaper and rotation, widgets, weather, and browser sync: `c2a7c5c`, `dac14aa`, `16b98b5`, `17c3836`, `ea2c9b0`
- M6g startup performance: `9862f27`
- M7 Firefox: `e25613a`
- M8 0.10.0 packaging, accessibility, and store materials: `7842086`
- M9 CI, community templates, and 20-pack gallery: `06d8909`; M9b CI screenshot stability: `47afa71`
- M10 mobile and touch: `14f4a8b`
- M11 hosted web app and PWA: `db876c0`
- M12 web install polish: `6ea865d`
- M13 public gallery page and “Try in web app”: `5fb7cb5`
- M14/M14b theme quality pass and banner layout: `f0d3c3a`, `40dea60`
- M15 test hygiene and i18n completeness: `7c1fe12`, `08e585d`
- M16 public docs: `ea5e0d0`
- M17 theme export and sharing: `878b659`
- M18 export fidelity: `1fe9a69`
- M19/M19b new-tab preferences, saved themes, accent on open, shortcuts, and group menu access: `cf01dc8`, `ce11152`
- M20 week numbers, greeting line, and selective restore: `5be14f4`
- M21 0.10.0 refresh, search presets, Infinity import, starter sites, and shortcut dialog: `1bdd6b3`, `f8efe79`, `c5bda25`, `24caebd`, `9227adf`, `4ddef33`, `7f310e9`, `28bc799`, `9daad48`, `f0f6b4a`

Remaining: submit the store listings; perform manual checks in real Firefox; consider embedding wallpapers in theme packs after a format change; remote image wallpapers remain intentionally unsupported.

---

日期：2026-10-31（取代同日的 v1 计划）  
产品名：Promptab  
配套文档：[docs/DESIGN.md](docs/DESIGN.md)（美学设计指南）

---

## 0. 目标

做一个**以本地数据为主、能高度自定义的 Edge/Chrome 新标签页扩展**。功能广度参考 [nightTab](https://github.com/zombieFox/nightTab)：布局、主题、背景、书签分组都可调。在此之上加一条 nightTab 没有的路径：**用户可以用自己的 AI 助手（ChatGPT、Claude、Kimi、DeepSeek、Copilot 等）生成布局、主题和 CSS，粘贴或拖入扩展后，校验、预览、一键应用，并且随时可以撤销。**

三层自定义，满足不同用户：

| 层级 | 面向谁 | 手段 |
| --- | --- | --- |
| ① 开箱即用 | 不想折腾的人 | 9 套精选预设、首次使用引导、合理默认值 |
| ② 可视化调整 | 喜欢动手的人 | 设置面板（对标 nightTab 的覆盖面）、编辑模式拖放、主题包自带的可调参数 |
| ③ 声明式扩展 | 会用 AI 或懂 CSS 的人 | 主题包（Theme Pack）JSON 和受限的自定义 CSS，配合 AI 提示包、错误回传、预览和历史版本 |

---

## 1. 当前进度（2026-10-31 审查）

**验证结果**：`vitest` 2 个文件、10 个测试全部通过；`tsc -b` 无错误；在开发服务器中以 1440×900 与 400px 宽两种窗口实测，页面正常渲染，设置抽屉可用。

| 模块 | 状态 | 说明 |
| --- | --- | --- |
| MV3 扩展骨架、构建 | ✅ 完成 | `chrome_url_overrides.newtab`，权限 `storage`、`favicon` |
| 时钟、日期、搜索 | ✅ 完成 | 12/24 小时制；Google、Bing、DuckDuckGo、Brave Search、Startpage、Ecosia、Qwant、Yahoo、Yandex、Kagi、Perplexity 和自定义模板；`/` 聚焦 |
| 快捷方式 | ✅ 完成 | 增删改、dnd-kit 拖拽与键盘排序、自动 favicon、文字或上传图标 |
| 外观与布局 | ✅ 基础 | 深浅主题、强调色、背景色、列数、图标尺寸与形状、对齐、上下或左右布局 |
| 壁纸 | ✅ 基础 | 本地图片存 IndexedDB，可调遮罩 |
| 右键菜单、中英文界面 | ✅ 完成 | |
| 备份导出 / 导入 | ❌ 未做 | README 已提示用户「不要依赖当前版本保存数据」，**最优先补齐** |
| 分组、组件系统、主题预设、自定义 CSS、AI 导入 | ❌ 未做 | 本计划的主体 |

**技术债**（不处理会阻碍后续开发）：

1. `App.tsx` 只有 47 行，但每行很长，状态、渲染、设置面板全挤在一个组件里。扩展到几十个选项前必须拆分。
2. `model.ts` 的 `validate` 是手写的长条件链，报错只有「布局配置无效」，无法定位到字段，AI 也无法据此修正。→ 改用 schema 库，按路径报错。
3. 配置是扁平结构（schemaVersion 1），没有分组、组件、主题概念。→ v2 结构加迁移（§5）。
4. i18n 以中文原文作为键，报错文案写死在逻辑中。→ 改为键值字典。
5. 样式中存在硬编码颜色，Unicode 符号当图标，设置与编辑模式耦合（详见 DESIGN.md §2）。
6. `Settings.wallpaper` 允许 data URL，但实际壁纸存在 IndexedDB 中，两条路径并存。→ 统一走资源库（§5.2）。

---

## 2. 产品原则

1. **本地优先**：无账号、无服务器；只有用户主动访问网站或主动启用联网功能时才产生网络请求。
2. **声明式，不执行用户脚本**：主题包只能包含数据和受限 CSS，绝不包含 JS。这样 MV3 远程代码政策、商店审核和安全风险都可控。
3. **任何改动可预览、可撤销**：导入先预览；应用前自动存快照；每次设置改动都可以撤销。
4. **永远能回来**：即使 CSS 写坏了，设置入口也不会消失，另有安全模式（§4.6）。
5. **默认好看，改了也不容易变丑**：设计令牌、对比度护栏、质量检查（DESIGN.md §3 与 §8）。
6. **对 AI 友好的数据格式**：所有配置都有 JSON Schema、稳定的 CSS API、示例和中英文说明，任何 AI 读完都能写出合法的主题包。

---

## 3. 参考项目调研

### 3.1 nightTab 深度对照

nightTab（GPL-3.0，约 2.1k stars，主分支最近一次推送为 2024-10，未归档，近期不活跃）。我读了它 `src/component/state/index.js` 中的默认状态和 `bookmarkDefault`，按模块对照如下：

| nightTab 能力 | 我们的对应设计 | 里程碑 |
| --- | --- | --- |
| `layout`：九宫格 alignment、direction、order、size 整体缩放、width、padding、gutter、区域宽度和对齐、滚动条样式 | 区域网格布局（`areas` + 断点覆盖）、`--mnt-scale`、内容宽度、间距、九宫格对齐 | M3 |
| `header`：greeting、transitional（「现在是…」）、clock（时分秒分别开关、文字或数字显示、分隔符）、date（各部分开关、序数词、周起始）、search（宽度、引擎、新标签打开），各项可单独缩放、换行、排序 | 组件系统：clock、date、greeting、search 等组件，各自带 `size` 和属性，放进任意布局区域 | M3 |
| `bookmark`：block 或 list 样式、显示网址、阴影、悬停放大、新标签打开；单个书签可调字母、图标、图片、颜色、旋转、位移、宽或高形状 | 网站样式变体 tile、list、minimal、card；单个网站可调图标类型、颜色、宽卡片 | M3 |
| `group`：分组名、折叠、分组工具栏 | 书签分组（可折叠、可拖动、分组内排序） | M3 |
| `toolbar`：位置、强调色快捷切换 | 设置入口位置可选；编辑模式浮动工具栏 | M2、M3 |
| `theme.color`：主色 + 对比度区间 + 阶数生成色阶 | 5 个基础色在 OKLCH 中推导完整色阶 | M2 |
| `theme.accent`：随机或循环强调色 | 「随机强调色」作为一个按钮；循环色只作为实验项 | M2 |
| `theme.font`：display 与 ui 两套字体，可调字重和样式 | `--mnt-font-display`、`--mnt-font-ui`，加本地字体上传 | M2 |
| `theme.background`：theme、accent、color、gradient、image、video，可调模糊、灰度、缩放、透明度、晕影 | 同等覆盖（视频延后）；图片和视频走本地资源库 | M2 |
| `radius`、`shadow`、`shade`、各区域颜色和透明度 | 全局 radius、shadow、glass 令牌，以及区域级覆盖 | M2 |
| 45 套预设主题 + 自定义主题保存 | 9 套精选预设，主题包可导入导出，「保存当前为我的主题」 | M2、M4 |
| 数据备份与恢复，可只恢复 setup 或 theme | 完整备份 + 主题包两种文件，导入时可勾选应用哪些部分 | M1、M4 |
| `stagedCustomTheme` 等「暂存后再提交」模式 | 所有编辑先进入草稿，预览后提交 | M1 |
| — （无自定义 CSS，无 AI） | **自定义 CSS、AI 工作台、可调变量** | M4、M5 |

**许可证边界**：nightTab 是 GPL-3.0。本计划只借鉴功能范围和交互思路，独立实现；本项目采用 MIT，未复制 nightTab 代码或预设数据。

### 3.2 其他参考

以下依据各项目公开说明整理，没有验证其内部实现；复用任何代码或素材前须核对具体版本的许可证。

| 项目 | 类型 | 借鉴点 |
| --- | --- | --- |
| [Bonjourr](https://github.com/victrme/Bonjourr) | 开源，GPL-3.0 | 自定义 CSS 和社区 CSS 片段文档；配置档（profiles）；emoji 作为图标 |
| [Anori](https://github.com/OlegWock/anori) | 开源 | 组件 + 文件夹的组织模型 |
| [Tabliss](https://github.com/joelshepherd/tabliss) | 开源，GPL-3.0 | 背景与组件可组合的轻量体验 |
| [Ultra New Tab](https://github.com/gunjit-gyawali/Chrome-Tab-Inhancer) | 开源 | 带版本的设置 schema、导入前预览与警告、部分导出、可导入 Bonjourr 配置 |
| Homepage、Dashy、Glance 等自托管仪表盘 | 开源 | **用 YAML 或 JSON 声明布局与组件**，这种格式天然适合 AI 生成，是本项目主题包的主要灵感 |
| VS Code 主题 | 开源生态 | 令牌化主题 + `$schema` 字段让编辑器和 AI 都能校验和补全 |
| Obsidian CSS 片段 + Style Settings 插件 | 闭源 + 社区插件 | CSS 中声明的变量会自动生成设置界面的控件，对应本计划的「可调变量」（§4.8） |
| Stylus / UserCSS | 开源 | CSS 带元数据头、版本号，便于分享和更新 |
| Infinity 新标签页、iTab、WeTab | 闭源 | 图标网格 + 小组件 + 云同步的大众市场形态；宽卡片组件尺寸 |
| Momentum | 闭源 | 极简的「时钟 + 问候 + 每日焦点」 |
| Chrome「Create with AI」主题 | 闭源 | 按主题、风格、情绪、颜色生成主题，参数化程度高，但不支持 CSS |
| [AI New Tab](https://chromeainewtab.com/) | 闭源 | 一句话描述，AI 生成完整的 HTML/CSS/JS 页面。是我们**不采用**的路线，见 §4.1 |

---

## 4. AI 自定义方案（核心差异化）

### 4.1 方案比较与选择

| 方案 | 做法 | 优点 | 问题 | 结论 |
| --- | --- | --- | --- | --- |
| A. AI 生成整页 | 用户让 AI 写完整的 HTML、CSS、JS，扩展加载它 | 自由度最高 | MV3 禁止执行远程代码，过商店审核困难；任意 JS 有安全风险；生成的页面和扩展功能（设置、书签、备份）脱节；扩展一更新就可能失效 | ❌ 不采用 |
| **B. 声明式主题包 + 受限 CSS** | AI 按公开的 schema 输出 JSON，可附带 CSS；扩展负责校验、预览和应用 | 适用于**任何** AI 助手，不需要 API key 或服务器；安全；结构化的部分能参与所有原生功能；CSS 补足 schema 表达不了的效果 | AI 需要先了解格式（由提示包解决）；输出可能有错（由容错解析和错误回传解决） | ✅ **核心方案** |
| C. 扩展内置 AI | 用户填自己的 API key，在扩展内直接对话生成 | 体验最顺滑 | 需要管理密钥、额外的网络权限、各家接口差异；要在 B 稳定后才有意义 | ⏳ 可选增强（M6），底层复用 B 的格式 |

**选择 B 作为核心**：主题包格式是唯一的「真相」，A 被排除，C 只是 B 的另一个入口。用户自己的 AI 助手生成主题包，扩展负责把关。

### 4.2 主题包（Theme Pack）格式

一个主题包可以只包含部分内容（例如只有颜色，或只有 CSS），未包含的部分保持用户当前设置不变。

```json
{
  "$schema": "https://<待定域名>/schema/theme-pack.v1.json",
  "kind": "mnt.theme-pack",
  "packVersion": 1,
  "meta": {
    "name": "暮色书房",
    "author": "可选",
    "description": "温暖的深紫渐变，衬线时钟，左右分区。",
    "createdWith": "Claude",
    "notes": "建议搭配一张暖色调的书房照片作为壁纸。"
  },
  "theme": {
    "mode": "dark",
    "color": { "bg": "#1b1626", "surface": "#251e33", "text": "#efe7dc", "accent": "#f2a07b" },
    "font": { "display": "serif", "ui": "system" },
    "radius": 16, "shadow": 40, "glass": 0, "density": "comfortable", "scale": 1
  },
  "background": {
    "type": "gradient",
    "gradient": { "angle": 160, "stops": ["#2a1f3d", "#12101c"] },
    "vignette": 30
  },
  "layout": {
    "contentWidth": 1080,
    "align": "center-center",
    "gap": 48,
    "areas": ["clock links", "search links"],
    "columns": ["1fr", "1.4fr"],
    "breakpoints": { "narrow": { "areas": ["clock", "search", "links"], "columns": ["1fr"] } }
  },
  "widgets": [
    { "id": "clock", "type": "clock", "area": "clock", "props": { "hour12": false, "seconds": false, "size": 1.2 } },
    { "id": "date", "type": "date", "area": "clock", "props": { "format": "weekday-month-day" } },
    { "id": "search", "type": "search", "area": "search", "props": { "engine": "default" } },
    { "id": "links", "type": "bookmarks", "area": "links", "props": { "source": "all-groups", "style": "tile", "maxColumns": 5, "showGroupTitles": true } }
  ],
  "variables": [
    { "name": "--glow", "label": { "zh-CN": "光晕强度", "en": "Glow" }, "type": "range", "min": 0, "max": 40, "unit": "px", "default": 12 }
  ],
  "css": ".mnt-clock { text-shadow: 0 0 var(--glow) color-mix(in oklch, var(--mnt-accent) 40%, transparent); }"
}
```

要点：

- **默认不含个人数据**：主题包里没有书签，`bookmarks` 组件只通过 `source` 引用用户自己的分组。主题包可以放心分享。
- 完整备份是另一种文件：`kind: "mnt.backup"`，包含书签、所有配置、资源和历史（§5.3）。
- `$schema` 让 VS Code 等编辑器直接校验和补全，人手写主题包也方便。
- schema 用代码定义（zod），由它生成 JSON Schema 和 TypeScript 类型，保证文档、校验器和类型三者一致。

### 4.3 用户流程：「AI 与主题包」面板

```
① 描述需求          ② 复制提示包          ③ 在 AI 助手里对话           ④ 带回结果
「想要像 Kindle 那种   → [复制给 AI]  ───→  （ChatGPT / Claude / Kimi …） ─→ 粘贴回复全文 / 拖入 .json .css
 纸质感的主页」         可勾选：附带当前主题     可附参考图片                       │
                                                                               ▼
⑦ 应用 → 存快照 → 可撤销      ⑥ 预览（暂存态，顶部横幅：应用 / 放弃）   ⑤ 解析 → 校验 → 质量检查
                                       ▲                                       │ 有错误
                                       └─────── 修正后重新粘贴 ←── [复制错误给 AI] ┘
```

1. **描述需求**（可选）：一个文本框，加上风格标签（极简、温暖、复古、赛博、自然、商务……）和「保留我当前的布局」「只改颜色」等勾选项。这些会写进提示包。
2. **复制提示包**：一键复制一段完整的 Markdown 提示词，内容见 §4.4。也可以「下载为 .md」，上传给支持文件的 AI。
3. **用户在自己的 AI 助手中对话**：不限平台，可以多轮修改，可以附截图或参考图。
4. **带回结果**：
   - 粘贴 AI 的**整段回复**即可，不需要用户自己挑出代码块；
   - 或拖入或选择 `.json`、`.css`、`.md` 文件；
   - 纯 CSS 也接受，会自动包装为只含 `css` 的主题包。
5. **解析、校验、质量检查**（§4.5），结果分为三级：错误（不能应用）、警告（可以应用但建议修改）、通过。
6. **预览**：应用到暂存态，桌面立即呈现效果；顶部固定横幅显示「预览中：暮色书房 · 应用 / 放弃 / 比较原版」。在预览状态下打开的新标签页不受影响。
7. **应用**：写入配置前自动存快照（保留最近 30 个版本，见 §5.3），toast 提供「撤销」。

**部分应用**：导入面板列出主题包包含的部分（主题、背景、布局、组件、CSS、可调变量），默认全选，用户可以只要其中一部分，例如「只要配色，不要布局」。这一点借鉴 nightTab 分别恢复 setup 和 theme 的做法。

### 4.4 AI 提示包内容

提示包由扩展在本地离线生成，中英文两版，控制在约 6–8k tokens，内容依次为：

1. **角色与任务**：「你在为 Minimal New Tab 新标签页扩展设计一个主题包……」
2. **输出约定**：只输出**一个** ```json 代码块，`kind` 必须是 `mnt.theme-pack`；不确定的字段省略，不要编造；需要图片时在 `meta.notes` 中说明。
3. **精简 schema**：从 zod 生成的字段说明，包括类型、范围、可选值和一行用途描述。比完整 JSON Schema 省 token，也更好读。
4. **CSS API 参考**：稳定的类名、`data-*` 属性和 `--mnt-*` 变量列表（§4.7）。
5. **设计约束**：DESIGN.md §10 原文。
6. **2 个示例主题包**：一个只改配色，一个使用完整的布局、CSS 和变量。
7. **用户当前配置**（勾选时附带）：当前的主题、背景、布局和组件，**不含书签网址**。
8. **用户需求**：第 ① 步填写的内容。

同时把这些文档放进仓库，供能读取文件的 AI（Claude Code、Cursor 等编码代理）直接使用：

- `docs/ai/llms.txt`：入口索引；
- `docs/ai/theme-pack.schema.json`：构建时生成；
- `docs/ai/css-api.md`、`docs/ai/examples/*.json`。

### 4.5 容错解析、校验与错误回传

**解析**（尽量接受 AI 的不规范输出）：

- 从回复中提取代码块，优先 `json`，其次 `css`；有多个时让用户选择；
- 使用 `jsonc-parser` 容忍注释和尾逗号；
- 常见小错误自动修复并告诉用户：颜色写成 `#abc` 时扩展为 6 位；数值写成字符串 `"16px"` 时转为数字；字段名大小写或常见别名（如 `accentColor` 改为 `accent`）。

**校验**：zod 按路径报错，例如 `theme.color.accent：需要 #RRGGBB 格式，收到 "teal"`。未知字段给出警告，不阻断应用。

**质量检查**（只产生警告）：

- 文字与背景、强调色与背景的对比度；
- 布局 `areas` 引用了不存在的组件，或组件放在不存在的区域；
- CSS 体积、规则数、选择器是否命中 CSS API 之外的结构（可能在扩展升级后失效）；
- 使用了未安装的本地字体。

**错误回传**：点击「复制错误给 AI」，生成一段可直接发回 AI 的文字：

> 你上一次输出的主题包有以下问题：  
> 1. `theme.color.accent`：需要 #RRGGBB 格式，收到 "teal"  
> 2. `layout.areas[1]`：区域 "weather" 没有对应的组件  
> 请修正后，在一个 json 代码块中重新输出**完整的**主题包。

### 4.6 自定义 CSS：安全与稳定

**级联层**：全站样式使用 CSS cascade layers：

```css
@layer guard, reset, tokens, base, widgets, theme, user;
```

- 用户和主题包的 CSS 经过解析后，**由扩展包进 `@layer user`**。语法错误或括号不平衡的 CSS 在解析阶段就被拒绝，所以不可能「逃出」这一层。普通声明中，越晚声明的层优先级越高，所以 user 层能覆盖所有内置样式。
- `guard` 层只包含带 `!important` 的规则，保证设置入口、安全模式横幅和预览横幅可见、可点。`!important` 声明的优先级与层的顺序相反，越早声明的层越优先，所以 `guard` 声明在最前。这样 user 层即使写了 `!important` 也覆盖不了 guard。实现时用测试验证这一行为。

**过滤规则**（基于 `css-tree` 解析出的 AST，按白名单处理）：

- 禁止 `@import`、`@namespace`、`@charset`；
- `url()` 只允许 `data:image/*` 和 `mnt-asset:<id>`（即用户自己上传的图片或字体，渲染时替换为 blob URL）。**禁止任何外部网址**，防止通过 CSS 加载第三方资源或泄露用户输入；
- `@font-face` 的 `src` 只能使用 `mnt-asset:`；
- 禁止 `-moz-binding`、`behavior`、`expression()`；
- 体积上限 64 KB，规则数上限 2000。

**内容安全策略**：在 manifest 中设置 `content_security_policy.extension_pages`，`script-src 'self'; object-src 'none'`，并显式写出 `font-src 'self' data: blob:`。作为第二道防线。

**安全模式**：

- 打开 `newtab#safe`，或在页面上连按 3 次 `Esc`，即进入安全模式：本次会话禁用用户 CSS、可调变量和主题包里的 CSS，并显示横幅「安全模式：自定义样式已暂停 · 编辑 CSS / 回滚到上一版本 / 退出」；
- 应用新 CSS 后，自动检测设置入口是否可见（通过 `getBoundingClientRect` 和计算样式）。若检测失败，自动回滚并提示。

### 4.7 CSS API（稳定约定）

想让 AI 写出的 CSS 在扩展升级后仍然有效，就要把「可依赖的部分」写成文档，并对它做版本管理：

- **类名**：只有带 `mnt-` 前缀的类名属于公开 API，例如 `.mnt-root`、`.mnt-area`、`.mnt-widget`、`.mnt-clock`、`.mnt-date`、`.mnt-search`、`.mnt-search-input`、`.mnt-group`、`.mnt-group-title`、`.mnt-link`、`.mnt-link-icon`、`.mnt-link-name`、`.mnt-settings-entry`。内部实现使用 CSS Modules 或其他不承诺稳定的类名。
- **数据属性**：`[data-widget="clock"]`、`[data-area="links"]`、`[data-group="工作"]`、`[data-link-host="github.com"]`（可以按网站定制样式）、`[data-theme-mode="dark"]`、`[data-edit-mode]`。
- **变量**：所有 `--mnt-*` 令牌（DESIGN.md §3）。
- **版本**：`cssApiVersion` 写在主题包和文档中。删除或重命名任何公开类名都需要提升主版本，并提供迁移说明。CI 中用快照测试防止公开类名被意外删除。

### 4.8 可调变量

借鉴 Obsidian 的 Style Settings：主题包可以声明 `variables`，扩展会在设置面板「当前主题」分区自动生成对应控件。支持的类型有 `range`、`color`、`toggle`（映射为 0/1）、`select`（枚举值）。用户调整后的值单独保存，**重新导入同一主题包的新版本时会保留**。

这样，AI 写的不再是一份「死的」CSS，而是带旋钮的主题，不懂代码的用户也能继续微调。

---

## 5. 数据模型 v2

### 5.1 结构概要

```ts
type ProfileV2 = {
  schemaVersion: 2
  meta: { id: string; name: string; createdAt: string; updatedAt: string }
  prefs: { language: 'system' | 'zh-CN' | 'en'; openIn: 'same-tab' | 'new-tab'; reduceMotion: 'system' | 'on' | 'off'; reduceTransparency: 'system' | 'on' | 'off' }
  theme: { preset?: string; mode: 'dark' | 'light' | 'system'; color: BaseColors; colorLight?: BaseColors; font: { display: FontRef; ui: FontRef }; radius: number; shadow: number; glass: number; density: 'compact' | 'comfortable' | 'spacious'; scale: number; iconShape: 'circle' | 'rounded' | 'square'; iconSize: number }
  background: { type: 'theme' | 'color' | 'gradient' | 'image' | 'accent'; color?: string; gradient?: { angle: number; stops: string[] }; image?: { asset: AssetId; blur: number; dim: number; grayscale: number; scale: number; vignette: number; position: string } }
  layout: { contentWidth: number; align: NineGrid; gap: number; areas: string[]; columns?: string[]; breakpoints?: Partial<Record<'narrow' | 'medium', { areas: string[]; columns?: string[] }>> }
  widgets: Widget[]          // { id, type, area, order, props, hidden? }
  bookmarks: { groups: Group[] } // Group { id, name, collapsed, items: Link[] }；Link 是现有 Shortcut 的扩展版本
  search: { engines: Engine[]; defaultEngineId: string }
  custom: { css: string; cssEnabled: boolean; variables: VariableDecl[]; values: Record<string, string | number>; sourcePack?: { name: string; importedAt: string } }
}
```

组件类型首批包括：`clock`、`date`、`greeting`、`search`、`bookmarks`、`text`（自定义文字或名言）、`spacer`。之后增加 `todo`、`note`、`weather`（需要联网，单独征求同意）。

### 5.2 存储分布

| 位置 | 内容 | 说明 |
| --- | --- | --- |
| `chrome.storage.local` | `profiles.index`、`profile:<id>`、`history:<id>`、`ui-state` | 申请 `unlimitedStorage`，避免历史快照触到 10 MB 配额 |
| IndexedDB `assets` 库 | 壁纸、上传的图标和字体 | 以内容 SHA-256 为 id 去重；配置中只存 `mnt-asset:<id>` |
| 内存 | 草稿或预览态 | 不落盘，关闭标签页即丢弃 |

资源采用引用计数：保存配置或删除历史时，清理不再被任何配置或快照引用的资源。

**多配置档**（Profiles，借鉴 Bonjourr）：例如「工作」「个人」「极简」，一键切换；每个配置档有独立的历史记录。

### 5.3 备份与历史

- **完整备份** `kind: "mnt.backup"`：包含所有配置档和资源（base64），不含历史。导入流程为：完整校验 → 显示差异摘要 → 确认 → 原子写入（先写临时键，成功后再切换）。失败时保留原数据。
- **历史快照**：应用主题包、导入、重置、切换预设前自动存快照；普通设置改动则按 30 秒合并一次。每个配置档保留最近 30 个快照，可命名和「钉住」（钉住的快照不会被淘汰）。设置面板中的「数据 → 历史版本」可预览并恢复任意版本。
- **从 v1 迁移**：首次加载 v1 数据时，先把原数据另存为 `backup:v1-original`，再迁移到 v2：快捷方式进入名为「常用」的分组；`layout`、`reverse`、`alignment` 转换为 `areas` 和 `align`；`showClock` 等开关转换为对应组件是否存在；内联 data URL 壁纸转存为资源。迁移必须有往返测试。

### 5.4 导入来源

1. 本扩展的主题包或完整备份（JSON）；
2. 纯 CSS 文件；
3. 浏览器书签（**运行时**用 `optional_permissions: ["bookmarks"]` 申请，只读，导入时可选择文件夹）；
4. nightTab 备份 JSON（映射其 bookmark、group，以及可映射的 theme 字段），方便 nightTab 用户迁移；
5. 后续：Bonjourr 配置、浏览器导出的 HTML 书签文件。

---

## 6. 功能范围（按模块）

### 6.1 主题

9 套预设（DESIGN.md §9）；5 个基础色加自动色阶；跟随系统深浅色；字体（系统、衬线、等宽、圆体、本地上传）；圆角、阴影、玻璃、密度、整体缩放；随机强调色；对比度警告与一键修正；「保存当前为我的主题」并导出为主题包。

### 6.2 背景

纯色、渐变（2–3 色标、角度）、强调色、本地图片（模糊、暗化、灰度、缩放、晕影、焦点位置）；根据壁纸亮度建议深色或浅色文字。本地视频和在线壁纸源（需要联网，单独开关）延后。

### 6.3 布局

- 布局 = 区域网格（`grid-template-areas`）+ 列宽比例 + 每个断点的覆盖。
- 内置布局模板：「居中堆叠」（默认）、「左右分区」、「顶栏 + 网格」、「仅网站」、「仅时钟（禅模式）」、「仪表盘（三栏）」。
- 编辑模式下可以拖动组件到其他区域、调整顺序；区域的增删和合并在「布局」分区用可视化的网格编辑器完成。高级用户可以直接编辑 `areas` 文本。
- **不做自由像素定位**：区域网格对响应式、AI 生成和可维护性都更友好。如果日后有需求，再加「自由画布」组件作为一个区域内的子布局。
- **区域样式**：每个布局区域可单独设置背景色、透明度、背景模糊（`backdrop-filter`）、宽度是否通栏，以及上下左右的强调色分隔线和线宽。布局模板「顶栏 + 网格」使用这些能力。

### 6.4 组件

每个组件都有统一的外框（`.mnt-widget`），统一支持 `size` 缩放、对齐、是否显示，并有各自的属性面板。时钟和日期覆盖 nightTab 中各部分的独立开关和格式选项；搜索支持多引擎快速切换、在新标签页打开、输入网址时直接跳转。

- **时钟与日期格式**：时、分、秒、星期、日、月、年各自独立开关；分隔符文字和两侧间距（例如「19 : 19」）；序数词（29th）；大写变换；日期各部分的顺序和分隔符。
- **组件工具栏**：设置入口可放在页面角落，也可放进某个布局区域，作为一行图标工具栏（强调色快捷切换、添加、编辑、设置）。

### 6.5 网站与分组

分组的增删、改名、折叠和拖动；网站可以在分组之间拖动；样式变体 tile、list、minimal、card；单个网站可调图标（自动 favicon、文字、emoji、上传图片）、颜色、宽卡片；批量操作（多选后移动或删除）；可选在新标签页打开。

- **品牌图标**：网站图标新增「品牌图标」类型，使用 Simple Icons（CC0），按名称搜索、按需懒加载，不得打进主包（主包已超过 500 KB）；Lucide 没有品牌图标，所以另行引入。同时支持把通用 Lucide 图标用作网站图标。
- **`icon-only` 样式变体**：只显示图标、不显示名称，图标使用强调色且无底板；悬停时图标下方出现强调色底的网址条（对应 nightTab 的 bookmark url.show）。

### 6.6 设置面板与编辑模式

按 DESIGN.md §5.5 和 §5.6 重做：分区标签、设置项搜索、每区重置、撤销 toast、与设置分开的编辑模式、浮动工具栏。

### 6.7 国际化与无障碍

键值化 i18n，覆盖中文和英文，日期和数字使用 `Intl`。无障碍要求见 DESIGN.md §8。

### 6.8 键盘快捷键

`/` 聚焦搜索，`E` 进入编辑模式，`,` 打开设置，`Ctrl+Z` 撤销上一次设置改动，连按 3 次 `Esc` 进入安全模式，`1–9` 打开前 9 个网站（可关闭）。

---

## 7. 架构

### 7.1 目录规划

```
src/
  app/            App.tsx（只负责组合）、providers、快捷键
  core/
    schema/       zod 定义：profile.ts、themePack.ts、widgets/*.ts；导出 TS 类型
    migrate/      v1→v2 等迁移和测试
    tokens/       基础色 → 完整令牌（OKLCH 推导、对比度工具）
    css/          sanitize.ts（css-tree）、layer 包装、资源 url 替换
    pack/         parse.ts（容错提取）、validate.ts、quality.ts、apply.ts（部分应用）
    prompt/       提示包生成（读 schema 描述 + css-api + 示例）
  store/          zustand：profile、draft/preview、history、undo
  storage/        chrome.storage 适配器、assets（IndexedDB）、backup
  widgets/        clock/ date/ greeting/ search/ bookmarks/ text/ spacer/，各含 View + Settings + schema
  features/
    settings/     抽屉、分区、设置项搜索
    edit-mode/    工具栏、拖放、区域轮廓
    ai-studio/    AI 与主题包面板（§4.3）
    data/         备份、历史、导入来源
  ui/             Button、Dialog、Menu、Toast、Slider、ColorField、Select（Radix）、Icon（Lucide）
  styles/         layers.css、reset.css、tokens.css、base.css
  i18n/           zh-CN.ts、en.ts
  presets/        9 套预设主题包（JSON）
docs/
  DESIGN.md
  ai/             llms.txt、theme-pack.schema.json（构建生成）、css-api.md、examples/
scripts/
  gen-schema.ts   由 zod 生成 JSON Schema 和提示包中的字段说明
```

### 7.2 技术栈增补

现有：React 19、TypeScript、Vite、dnd-kit、Radix Select、idb、Vitest。计划新增以下依赖，版本实施时固定；许可证为预期值，安装时以 npm 实际信息为准：

| 依赖 | 用途 | 许可证 |
| --- | --- | --- |
| `zod`（v4） | schema、校验、生成 JSON Schema | MIT |
| `zustand` | 状态、草稿和撤销 | MIT |
| `css-tree` | CSS 解析与过滤 | MIT |
| `jsonc-parser` | 容错解析 JSON | MIT |
| `culori` | OKLCH 色彩运算、对比度 | MIT |
| `lucide-react` | 图标 | ISC |
| Radix 的 Dialog、Popover、Tabs、Slider、Toast | 无障碍基础组件 | MIT |
| `@playwright/test` | 端到端测试：加载 dist 扩展、截图对比 | Apache-2.0 |

### 7.3 权限

- 常驻：`storage`、`favicon`、`unlimitedStorage`；
- 可选（运行时申请）：`bookmarks`（导入书签）。M6 的 BYOK AI 和在线主题画廊使用 `optional_host_permissions`，只对用户确认的域名申请。

---

## 8. 里程碑

每个里程碑结束时：`npm run test -- --run` 与 `npm run build` 通过；在 Edge 中加载 `dist` 手动验证；对照 DESIGN.md §11 设计验收清单逐项检查。

### M0：整顿地基（约 1 周）

- 按 §7.1 拆分 `App.tsx`；引入 `styles/` 分层与令牌，替换所有硬编码颜色；换用 Lucide 图标；修复 DESIGN.md §2 中的 1–3 和 8（宽屏比例、硬编码颜色、图标、时钟抖动）。
- i18n 改为键值字典。
- **先做最小可用的完整备份导出和导入**（v1 格式），尽早消除 README 中「不要依赖当前版本」的风险。
- 引入 Playwright，生成 4 种窗口尺寸的基准截图。
- 验收：功能与现状一致，视觉按设计指南改进；导出 → 清空 → 导入后数据完全恢复。

### M1：数据模型 v2 与可靠性（约 1–2 周）

- 用 zod 定义 v2 schema，实现 v1→v2 迁移（保留原始数据）；按路径报错。
- zustand store：草稿和预览态、撤销栈、历史快照、多配置档。
- 资源库（SHA-256 去重、引用计数）；壁纸迁移进资源库。
- 完整备份 v2，导入时显示差异摘要，原子写入。
- 测试先行：迁移往返、损坏数据、未知版本、超大资源、写入失败回滚、快照淘汰与钉住。
- 验收：从 v1 数据升级无损；任何设置改动都可撤销；历史中任一版本可恢复。

### M2：主题系统与设置面板（约 2 周）

- 令牌推导（OKLCH）、9 套预设（以主题包形式内置）、字体（系统/衬线/等宽/圆体）、背景（渐变、图片滤镜、晕影）、对比度护栏。
- 按 DESIGN.md §5.5 重做设置面板：分区标签、搜索、每区重置、撤销 toast。
- **自定义 CSS 编辑器（基础版）**：文本框，加上过滤、级联层、guard 层、安全模式。
- **AI 工作台 v1**：只覆盖 theme、background、css，包括提示包、粘贴解析、校验、错误回传、预览和应用。
- 验收：9 套预设对比度达标；粘贴一段带错误的 AI 回复能定位错误，修正后能应用；写坏的 CSS 无法遮挡设置入口；`#safe` 有效。
- **M2b 追加**：本地上传字体（存入资源库）；另外打包 2–3 款 OFL 许可的显示字体（其中一款为窄体科技风），仍然不从网络加载字体。

### M3：布局引擎、组件与分组（约 2–3 周）

- 区域网格布局与断点覆盖、6 个布局模板、可视化网格编辑器。
- 组件框架与首批 7 个组件；把时钟、日期、搜索的选项扩展到 nightTab 的覆盖面。
- 书签分组、网站样式变体、跨组拖动、批量操作。
- 编辑模式（与设置分离、浮动工具栏、区域轮廓、悬停工具条、键盘拖放）；首次使用引导卡片。
- 浏览器书签导入（运行时申请权限）、nightTab 备份导入。
- **AI 工作台 v2**：主题包覆盖 layout 和 widgets；提示包加入布局示例。
- 验收：仅用编辑模式和设置面板即可复现 nightTab 默认主页与另外两种布局；AI 生成的左右分区布局可直接应用，并且窄屏时自动堆叠。
- 新增能力（来自两张 nightTab 参考截图）：品牌图标（Simple Icons，懒加载）、`icon-only` 变体与悬停网址条、时钟日期的细粒度格式、组件工具栏、区域样式（背景、透明度、背景模糊、通栏、强调色分隔线）。详见 §6.3–§6.5。
- **目标布局 A「左右分区 · 纯图标」**：左侧 3 列网站网格，只显示图标、不显示名称，图标为强调色、无底板，悬停时图标下方出现强调色底的网址条；中间一条强调色竖分隔线；右侧依次是时钟（「19 : 19」，分隔符两侧有空格）、日期（「Tuesday / 10 / August / 2021」，自定义分隔符）和时钟下方一行图标工具栏（强调色圆点、添加、编辑、设置）。浅色主题，配壁纸。
- **目标布局 B「顶栏横幅」**：页面上方三分之一处一条横贯全宽的半透明色带，色带内背景模糊，下沿为强调色细线；色带内右对齐依次放时钟、日期（带序数词，如「29th」，全部大写）和设置图标，使用特色显示字体；网站区隐藏；背景为暗化后的壁纸。
- **验收（追加）**：只用设置面板、不写自定义 CSS，即可复现 A 和 B；两者各做成一个内置布局模板，并各有一张基准截图。视频背景仍留在 M6。

### M4：CSS API 与主题包生态（约 1–2 周）

- 发布 CSS API v1 文档和公开类名快照测试；`[data-link-host]` 等数据属性。
- 可调变量（§4.8），用户值在重新导入时保留。
- 构建时生成 `docs/ai/` 下的全部文件；`$schema` 托管（GitHub Pages 或仓库 raw 地址）。
- 主题包导出（「保存当前为我的主题」）、部分应用、预览中的「比较原版」。
- CSS 编辑器升级：语法高亮（轻量的 CodeMirror 6，按需加载）、实时错误提示、`--mnt-*` 变量自动补全。
- 验收：一个从未见过本项目的 AI（至少测试 3 家）仅凭提示包，一次生成合法主题包的成功率 ≥ 80%，经过一轮错误回传后 ≥ 95%。这一数字作为发布门槛，测试记录写入 `docs/ai/eval.md`。

### M5：打磨与发布（约 1–2 周）

- 性能：首帧 < 100ms（壁纸与 favicon 懒加载，同步读取缓存的令牌 CSS 以避免闪烁）；包体检查。M1 构建已出现单个 chunk > 500 KB 的警告，M5 按需拆分设置面板和 AI 工作台，并复核首屏加载成本。M2b 后包体为 829 kB（css-tree 为主）：设置面板、AI 工作台、CSS 编辑器（含 sanitizer/css-tree）按需懒加载。
- 隐私说明、权限说明、商店素材；Edge 加载项商店与 Chrome 应用商店上架；Firefox 兼容性评估。
- README 和用户文档：「5 分钟用 AI 做一个主页」教程，附带示例对话。

### M6：可选增强（不阻塞发布）

- **上架后性能优化**：首屏 JS 当前约为 485.7 KB raw（含 React vendor 与主题 bootstrap），用 500 KB 的端到端总量护栏防回归，测量方法见 [docs/performance.md](docs/performance.md)。进一步按需加载编辑模式、dnd-kit、网站编辑相关代码；评估延后完整 zod 校验时的数据完整性与错误恢复，不能用移动 chunk 的方式虚报首屏成本降低。
- **内置 AI（BYOK）**：用户填写 API key（只存本地），支持 Anthropic、OpenAI 兼容接口；对话直接产出主题包，走相同的校验和预览流程。可附当前页面截图作为视觉参考。
- **主题画廊**：GitHub 仓库收集社区主题包（PR 提交，CI 自动校验 schema 和 CSS 规则），扩展内按网址导入（`optional_host_permissions` 只申请该仓库的 raw 域名）。
- 更多组件：待办、便签、天气（需明确数据来源与网络请求）、倒计时。
- 本地视频背景、壁纸轮换。
- 跨设备同步：`storage.sync` 只同步配置不同步资源，或使用用户自己的 WebDAV 或 Gist；需单独设计冲突处理与隐私。

### M21：0.10.0 发布更新（已完成）

- 更新发布说明、商店介绍、隐私说明和七张商店截图；构建并验证 Chromium 与 Firefox 安装包，不更改版本号或提交商店。
- 提供 11 个搜索引擎预设，并保留自定义搜索模板。
- 在本地导入 Infinity New Tab 备份，预览支持的数据，以追加或替换方式导入并支持一次撤销；不下载远程图片和云端壁纸。
- 全新安装提供八个可编辑的初始网站和内置图标，可在设置中移除未修改的初始网站并撤销；首次使用引导保留至用户选择操作。
- 优化键盘快捷键帮助对话框的主题样式、焦点管理和键盘操作，并验证中英文及浅色、深色显示。
- 验证单元测试、TypeScript、构建、发布包、文档、Chromium、Web、Firefox 和首屏 JavaScript 预算。

---

## 9. 风险与待决事项

| 事项 | 影响 | 建议 |
| --- | --- | --- |
| **项目许可证** | 决定能否直接移植 nightTab 的代码和 45 套预设 | **已定：MIT，独立实现，未复制 nightTab 代码或预设数据** |
| AI 输出质量参差 | 用户第一次尝试失败就会流失 | 容错解析、错误回传、提示包中的示例；M4 的成功率门槛 |
| CSS API 变动导致社区主题失效 | 生态信任 | 公开类名快照测试、版本号、迁移说明 |
| 存储容量 | 历史快照和资源膨胀 | `unlimitedStorage`、资源去重、快照数量上限 |
| 商店审核 | 「自定义 CSS」与「远程代码」的界定 | 只接受 CSS 和数据，不接受 JS；CSP；在审核说明中写清楚 |
| 新标签页被浏览器提示「是否保留更改」 | 首次安装体验 | README 和首次使用引导中说明 |
| 范围膨胀 | 迟迟发布不了 | M0–M3 构成可发布的核心；M4 是差异化；M6 全部可选 |

---

## 10. 设计与实施约定

- 默认配置不含推广链接；全新安装提供可编辑和移除的初始网站，并保留首次使用引导卡片。
- 不默认读取浏览器书签和历史记录，不联网获取图标之外的资源；所有联网功能单独开关并说明去向。
- 不把大图写进 `chrome.storage`；资源一律进入 IndexedDB 资源库。
- 新增任何配置字段都要同时更新：zod schema、默认值、迁移（如需要）、i18n 文案、提示包字段说明、测试。由 `scripts/gen-schema.ts` 和 CI 检查保证 schema 与文档同步。
- 视觉改动必须对照 DESIGN.md；新增颜色、尺寸必须先成为令牌。
- 实际 UI 和安装效果需要在 Edge 中验证，不能只凭构建成功判断。
