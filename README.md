# Minimal New Tab

English | [简体中文](README.zh-CN.md)

A quiet, customizable new tab extension for Edge (Chromium, Manifest V3). Requires Node.js 22 and npm. Still under development.

## Features

- Clock, date and search box
- Shortcuts with automatic website icon detection, local image icons and text icons, plus drag-and-drop sorting
- Customizable layout (stacked or side by side), columns, icon size, icon shape and alignment
- Local wallpaper with an adjustable overlay
- Right-click menus on widgets and the background
- English and Simplified Chinese interface
- Complete JSON backup export/import, including settings, shortcuts, local icons and wallpaper

In Settings → Data, choose **Export backup** to save a file. Choose **Import backup** to validate a file and review its website count, wallpaper status and export date before replacing your setup. Wallpaper supports PNG, JPEG and WebP up to 5 MB. If an import write fails, the extension attempts to restore both previous settings and wallpaper. Keep a backup outside the browser before uninstalling.

## Development

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

## Load in Edge

Open `edge://extensions`, turn on Developer mode, choose "Load unpacked", and select the project's `dist` folder. The browser may ask you to confirm the new tab change.

## Permissions and data

The extension requests the `storage` and `favicon` permissions. `favicon` reads website icons cached by the browser. If the cache is unavailable, it requests the site's `/favicon.ico`, so the website may receive a connection request. Settings are stored locally in the browser, and uninstalling the extension may delete them.
