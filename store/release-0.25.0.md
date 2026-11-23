# Promptab 0.25.0 商店发布材料

0.24.1 is live in Edge Add-ons and the Chrome Web Store. 0.25.0 switches on Google Drive sync.

## What's new — English

- Sync across Chrome, Edge and Firefox with your own Google Drive: open Settings → Sync, choose Google Drive and sign in. Promptab keeps your profile in a hidden app folder in your Drive and can't see your other files.

## 更新内容 — 简体中文

- 可以用你自己的 Google 云端硬盘在 Chrome、Edge 和 Firefox 之间同步：打开设置 → 同步，选择 Google 云端硬盘并登录。Promptab 把配置保存在你云端硬盘里一个隐藏的应用文件夹中，看不到你的其他文件。

## Notes for certification

```text
Promptab replaces the browser's new tab with a customizable dashboard. No Promptab account or login is required. Core features and manual AI copy/paste require no API key. Optional direct AI requests use a key supplied for that session and require the user's own Anthropic or OpenAI key; provider charges may apply.

The storage permission saves the user's profiles, settings, shortcuts, theme, undo history and wallpapers (chrome.storage.local) and, when the user turns on Browser Sync, sync data (chrome.storage.sync). To see it: open a new tab, open Settings (gear icon), change the theme, then open a new tab again; the change is kept.

New in 0.25.0: the identity permission. It is used only by chrome.identity.launchWebAuthFlow to open Google's sign-in page when the user turns on Google Drive sync. The only scopes requested are openid and https://www.googleapis.com/auth/drive.appdata (Promptab's own hidden app folder, never the user's other files). The optional host permission https://www.googleapis.com/* is requested in the same click and used only to read and write that app folder. The access token is kept in chrome.storage.session; no Promptab server is involved.

To test 0.25.0: open a new tab, open Settings (gear icon) → Sync, set "Sync with" to Google Drive, turn sync on and sign in with any Google account. Change the theme accent, then open a new tab in another browser or profile signed in the same way; the change appears.

Required permissions are storage, unlimitedStorage, identity and Chromium's favicon permission. Optional bookmarks permission is requested only when the user chooses browser bookmark folders. Optional host permissions for Anthropic, OpenAI, Open-Meteo, BigDataCloud and www.googleapis.com are requested only when the corresponding direct AI, weather or Google Drive action is used.

All executable extension code is packaged. Promptab does not fetch or execute remote code. The extension_pages CSP is: script-src 'self'; object-src 'none'; font-src 'self' data: blob:
```

## 精简版 publish_notes

```text
Google Drive sync on: adds identity (sign-in via launchWebAuthFlow, drive.appdata scope only) and optional host www.googleapis.com. All executable code is packaged.
```

## Manifest and permission differences from 0.24.1

- `version`: `0.24.1` → `0.25.0`.
- `permissions`: adds `identity`.
- `optional_host_permissions`: adds `https://www.googleapis.com/*`.
- Firefox: the optional data-collection categories add `bookmarksInfo`. `authenticationInfo` was already listed. CSP is unchanged.

## Chrome Developer Dashboard: privacy practices

The new permission needs a justification under **Privacy practices** before review can finish. Paste:

```text
identity: opens Google's sign-in page (chrome.identity.launchWebAuthFlow) when the user turns on Google Drive sync, so their profile can be stored in Promptab's hidden app folder (drive.appdata scope) in their own Google Drive.
```

Host permission justification addition:

```text
https://www.googleapis.com/*: optional, requested when the user turns on Google Drive sync; used only to read and write Promptab's own app folder through the Google Drive API.
```

## Privacy

Data use is as already described in the privacy policy (effective 2026-11-22): with Google Drive sync on, Google stores the synced profile in the app folder and receives the OAuth token.

## Firefox

Firefox has no publish workflow: upload `promptab-firefox-0.25.0.zip` from the GitHub release to addons.mozilla.org by hand.

## Startup

Startup JavaScript: **444,825 bytes raw** in the store build with the Google client ID, under the unchanged 480,000-byte budget.

## Store text that must be pasted by hand

Partner Center and Chrome developer console descriptions, screenshots and the "What's new" text above are not updated by the publish workflow; paste them by hand if desired.
