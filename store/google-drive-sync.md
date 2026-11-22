# Google Drive sync: OAuth client setup

Google Drive sync ships only in builds made with `VITE_GOOGLE_DRIVE_CLIENT_ID`. Without it the package is unchanged:
no `identity` permission, no `https://www.googleapis.com/*` host, no Drive option in Settings.

1. In Google Cloud Console, create a project, enable the **Google Drive API**, and configure the OAuth consent screen
   with the single scope `https://www.googleapis.com/auth/drive.appdata` (non-sensitive, so no security assessment).
   Publish the app ("In production"); while it is in "Testing" only listed test users can sign in.
2. Create an OAuth client of type **Web application**. Add one authorized redirect URI per store build:
   - Chrome Web Store: `https://aeiigkihjpgggiohlfcglacilnllmboi.chromiumapp.org/`
   - Edge Add-ons: `https://<edge-extension-id>.chromiumapp.org/`
   - Firefox: the value of `browser.identity.getRedirectURL()` for `promptab@zanderh-code.github.io`
     (`https://<hash>.extensions.allizom.org/`; print it from the add-on's console).
   - Unpacked local builds have their own ID; add `https://<unpacked-id>.chromiumapp.org/` while testing.
3. The client ID is public (the implicit grant has no client secret). Store it as the GitHub repository **variable**
   `GOOGLE_DRIVE_CLIENT_ID`; `publish-chrome.yml` and `publish-edge.yml` pass it to `npm run build`. For a Firefox
   package, run `VITE_GOOGLE_DRIVE_CLIENT_ID=… npm run package:firefox`.
4. Check the built manifest lists `identity`, then sign in once on Chrome, Edge and Firefox and confirm a change made in
   one browser appears in another after opening a new tab.

Tokens last about an hour. Promptab renews them silently (`prompt=none`); if the browser's Google session is gone it
pauses Drive sync, shows one notice per browser session, and keeps a **Sign in to Google** button in Settings.
