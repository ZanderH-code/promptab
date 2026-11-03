# Mobile browser support

Last reviewed: 2026-11-02

This project is distributed as a browser extension. A responsive extension page and a browser's extension API support are separate capabilities: a narrow viewport alone does not make an extension installable or allow it to replace a browser's new-tab page.

## Mobile capability check

| Browser | Install extensions | `chrome_url_overrides.newtab` | `storage.sync` | `optional_host_permissions` |
| --- | --- | --- | --- | --- |
| Firefox for Android | Yes, from Mozilla's Android add-ons catalog; extensions must be compatible with Android. | No. MDN's browser-compat-data marks `firefox_android` unsupported for this feature. | The API exists, but Firefox for Android does not sync its data to a Mozilla account. MDN marks this as partial support. | Yes. MDN browser-compat-data marks the Android entry as mirroring Firefox support. |
| Microsoft Edge for Android | Limited mobile extension support is documented by Microsoft; its mobile FAQ lists Adblock Plus and Coupons. Availability is determined by Edge's mobile catalog. | No supported mobile new-tab override is documented. Edge documents its own new-tab page and feed settings. | Not established by Microsoft's mobile extension documentation or MDN's browser-compat-data. Do not rely on this API for Edge Android sync. | Not established by Microsoft's mobile extension documentation or MDN's browser-compat-data. Treat runtime host grants as unavailable until tested on the target Edge release. |
| Google Chrome for Android | No general Chrome extension installation path is documented for Android; Chrome's extension installation docs cover desktop platforms. | Unavailable because Chrome for Android does not provide the general extension platform. | Unavailable to a Chrome extension on Android. | Unavailable to a Chrome extension on Android. |
| Chrome for iPadOS | No general Chrome extension installation path is documented for iPadOS. | Unavailable. | Unavailable. | Unavailable. |
| Edge for iPadOS | Microsoft's mobile FAQ documents Adblock Plus as a built-in content blocker, not a general WebExtension catalog. | No extension new-tab override is documented; Edge exposes its own new-tab settings. | Unavailable to a general extension. | Unavailable to a general extension. |

MDN's compatibility data is specific to the browser feature and is the source for Firefox Android's `newtab`, `storage.sync`, and optional-host-permission rows. An omitted mobile browser in BCD is not proof of support. Where Microsoft documents a limited mobile extension feature but does not document these APIs, this page treats the API as unverified rather than assuming desktop Edge behavior applies.

## What users can reach

Firefox for Android can install compatible add-ons, but it cannot use this extension to replace the new-tab page. Its `storage.sync` data is also not account-synced on Android. Edge for Android has limited extension support, but the official mobile documentation does not establish the API combination this project needs, and its documented new-tab page remains Edge's own page. Chrome on Android and Chrome/Edge on iPadOS do not offer this project's general extension surface; Edge's iPadOS content blocker is a separate built-in feature.

Therefore, this extension is not reachable by opening a new tab in any of these mobile browsers. Users need another way to open the experience, such as a separately hosted web page bookmarked on the home screen or a browser-supported home-page shortcut. A `moz-extension://` or `chrome-extension://` URL is not a portable mobile entry point. This conclusion does not imply a mobile-only extension build.

## Sources

- [MDN: `chrome_url_overrides`](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/chrome_url_overrides)
- [MDN browser-compat-data: `chrome_url_overrides`](https://github.com/mdn/browser-compat-data/blob/main/webextensions/manifest/chrome_url_overrides.json)
- [MDN: `storage.sync`](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/sync)
- [MDN browser-compat-data: storage API](https://github.com/mdn/browser-compat-data/blob/main/webextensions/api/storage.json)
- [MDN: `optional_host_permissions`](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/optional_host_permissions)
- [MDN browser-compat-data: `optional_host_permissions`](https://github.com/mdn/browser-compat-data/blob/main/webextensions/manifest/optional_host_permissions.json)
- [Mozilla Support: Find and install add-ons on Firefox for Android](https://support.mozilla.org/en-US/kb/find-and-install-add-ons-firefox-android)
- [Microsoft Support: Edge for mobile FAQs](https://support.microsoft.com/en-us/microsoft-edge/microsoft-edge-for-mobile-faqs-29296eab-b76f-4a87-ac9c-9835da53465d)
- [Microsoft Learn: Edge mobile policies](https://learn.microsoft.com/en-us/deployedge/microsoft-edge-mobile-policies)
- [Chrome for Developers: Install extensions](https://developer.chrome.com/docs/extensions/how-to/distribute/install-extensions)
