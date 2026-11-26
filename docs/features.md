# Promptab Feature Map

Shared vocabulary for finding, exercising, and verifying user-facing features.
Run the app locally with `npm run dev` (hot reload) or `npm run build && npm run preview` (`http://127.0.0.1:4173`), or run `npm run verify:ui` (screenshots to `.artifacts/ui-verify/`).

## Surfaces & Entry Points

| Surface | URL / Entry | Build / Run | Primary E2E |
| --- | --- | --- | --- |
| New tab page (Extension / preview) | `/` (or `chrome://newtab` with `dist/` loaded unpacked) | `npm run dev` / `npm run preview` | `e2e/desktop.spec.ts`, `e2e/mobile.spec.ts` |
| Safe mode (custom CSS paused) | `/#safe` or press `Esc` 3× | `npm run preview` | `e2e/settings.spec.ts`, `src/app/safeMode.test.tsx` |
| Hosted Web / PWA app | `http://127.0.0.1:4174/promptab/app/` | `npm run build:web && npm run preview:web` | `e2e/web.spec.ts` (`npm run test:web`) |
| Firefox extension build | `dist-firefox/manifest.json` (`about:debugging`) | `npm run build:firefox` | `e2e/firefox-smoke.spec.ts` (`npm run test:firefox`) |
| Public docs & theme gallery | `docs/index.html`, `docs/gallery/index.html`, `docs/docs/index.html` | `npm run docs:public && npm run gallery` | `e2e/docs.spec.ts`, `e2e/gallery.spec.ts` |

## Feature Directory

| Feature (EN / 中文) | How to reach it | Key source files | E2E / verification |
| --- | --- | --- | --- |
| **Onboarding & starter sites** / 首次引导与初始网站 | Fresh profile on `/` | `src/widgets/OnboardingCard.tsx`, `src/core/starter-sites.ts` | `e2e/infinity-starters.spec.ts`, `e2e/reproduce-icon-split.spec.ts` |
| **Settings drawer & search** / 设置抽屉与搜索 | `,` key or corner gear button (`.mnt-settings-entry`); desktop Peek button | `src/features/settings/SettingsDrawer.tsx`, `src/features/settings/rows/` | `e2e/settings.spec.ts`, `e2e/settings-tabs.spec.ts`, `e2e/accessibility.spec.ts` |
| **Theme presets, colors, fonts & variables** / 主题预设、配色与字体 | Settings → **Theme** (`外观` / `主题`) | `src/presets/`, `src/core/tokens/`, `src/features/settings/rows/appearance.tsx`, `FontUpload.tsx` | `e2e/presets.spec.ts`, `e2e/m2b.spec.ts`, `e2e/theme-layout.spec.ts` |
| **Wallpaper, rotation & video** / 壁纸、轮换与视频背景 | Settings → **Background** (`背景`) | `src/app/useWallpaper.ts`, `src/core/wallpaper.ts`, `src/features/wallpaper/WallpaperVideo.tsx` | `e2e/wallpaper-rotation.spec.ts`, `e2e/video-background.spec.ts` |
| **Areas, grid templates & area styles** / 区域与网格 | Settings → **Areas & grid** (`区域与网格`) | `src/core/layout/`, `src/features/settings/rows/layout.tsx`, `AreaGridPreview.tsx` | `e2e/m3-layout.spec.ts`, `e2e/m3b-area.spec.ts` |
| **Widgets & per-widget placement** / 组件与位置 | Settings → **Widgets** (`组件`): Clock, Date, Search, Bookmarks, Greeting, Text, Spacer, Toolbar, Todo, Note, Countdown, Weather | `src/widgets/`, `src/features/settings/rows/widgets.tsx`, `WidgetPlacement.tsx` | `e2e/widget-layout.spec.ts`, `e2e/m6d-productivity.spec.ts`, `e2e/m20.spec.ts`, `e2e/clock-fit.spec.ts` |
| **Weather widget & location** / 天气组件 | Settings → **Widgets** → Weather card | `src/core/weather.ts`, `src/widgets/WeatherWidget.tsx`, `src/features/settings/rows/WeatherSettings.tsx` | `e2e/m6e-weather.spec.ts` |
| **Websites, groups, folders & drag-and-drop** / 网站、分组与拖拽 | Desktop grid, `E` key (Edit mode), right-click menu, Settings → **Websites** (`网站`) | `src/widgets/ShortcutGrid.tsx`, `EditingShortcutGrid.tsx`, `DisplayDragGrid.tsx`, `BookmarkFolder.tsx`, `src/features/shortcut-editor/` | `e2e/desktop-drag*.spec.ts`, `e2e/drag-follow.spec.ts`, `e2e/bookmark-folders.spec.ts`, `e2e/m3b-*.spec.ts` |
| **Website icons & brand catalog** / 网站图标与品牌库 | Automatic discovery, brand picker, Lucide/text/emoji/custom upload | `src/core/favicon*.ts`, `src/core/brand*.ts`, `src/widgets/WebsiteIcon.tsx` | `e2e/favicon-*.spec.ts`, `e2e/brand-*.spec.ts`, `e2e/site-name.spec.ts` |
| **Search & keyboard shortcuts** / 搜索与快捷键 | `/` focuses search; `1–9` opens sites; `Ctrl+Z` undo; `?` shortcut help; Settings → **Search** (`搜索`) | `src/widgets/Search.tsx`, `src/core/search/engines.ts`, `src/app/KeyboardHelp.tsx` | `e2e/m19.spec.ts`, `src/app/App.keydown.test.tsx` |
| **Custom CSS editor & guard layer** / 自定义 CSS | Settings → **Custom CSS** (`自定义 CSS`) | `src/features/settings/CssEditor.tsx`, `CssCodeMirror.tsx`, `src/core/css/sanitize.ts`, `src/styles/guard.css` | `e2e/settings-draft-profile.spec.ts`, `src/styles/guard.test.ts` |
| **AI assistant, BYOK & gallery** / AI 助手与画廊 | Settings → **AI assistant** (`AI 助手`) | `src/features/settings/AiWorkbench.tsx`, `ByokPanel.tsx`, `Gallery.tsx`, `MyThemes.tsx`, `src/core/ai/` | `e2e/ai-messages.spec.ts`, `e2e/byok.spec.ts`, `e2e/gallery.spec.ts`, `npm run eval:replay` |
| **Profiles, backups, history, sync & imports** / 配置档、备份、同步与导入 | Settings → **Backup & import** (`备份与导入`): v2 backup (restore, or append websites after the current groups; pick, drop or paste), nightTab, Infinity, browser bookmarks, Browser Sync or Google Drive sync (cross-browser; builds with `VITE_GOOGLE_DRIVE_CLIENT_ID`) | `src/storage/`, `src/store/`, `src/features/settings/BackupSection.tsx`, `SyncSection.tsx`, `src/app/syncRuntime.tsx`, `src/core/gdrive.ts`, `src/platform/googleAuth.ts`, `NightTabImport.tsx`, `InfinityImport.tsx`, `BrowserBookmarkImport.tsx` | `e2e/migration.spec.ts`, `e2e/backup-append.spec.ts`, `e2e/m6f-sync.spec.ts`, `e2e/m6f-two-device.spec.ts`, `e2e/gdrive-sync.spec.ts`, `e2e/nighttab-tab-title.spec.ts` |
| **Language & accessibility** / 语言与无障碍 | Settings → **About** (`关于`) | `src/i18n/`, `src/ui/useReducedMotion.ts` | `e2e/i18n-regression.spec.ts`, `e2e/accessibility.spec.ts` |
| **Startup budget & paint** / 首屏性能 | Saved-profile reload on `/` | `public/theme-bootstrap.js`, `src/app/paintCache.ts`, `src/widgets/lazyWidgets.ts` | `e2e/startup-performance.spec.ts`, `e2e/startup-interactions.spec.ts`, `npm run measure:flash` |
