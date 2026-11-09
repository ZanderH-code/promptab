# Changelog

All notable changes to Promptab are documented here. This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.15.0]

### Added

- Every settings section shows a sticky header with a one-line description and its “Restore section defaults” action, kept in view while scrolling.
- The Layout section draws the committed area grid, names its areas for screen readers, explains that custom areas can be renamed, and renames them in place across every breakpoint, widget and area style in one undo step.
- The gradient editor shows the real gradient at page size with its angle and stops, and says gradients only render in dark mode.
- An image background previews the focal point with a crosshair that can be clicked or dragged, sharing the stored position with the named buttons and sliders.
- Both wallpaper pickers are styled, localized controls with file names and drag-and-drop.
- Background and layout controls gained one-line explanations that screen readers also receive.

### Fixed

- Clicks on the page behind settings are blocked at every viewport width, and a click on the scrim dismisses the drawer without activating anything underneath.
- Settings search opens the Advanced layout fields it matches.

### Changed

- The raw layout DSL now sits behind an “Advanced” disclosure.
- Numeric hints are announced as the control’s accessible description.

## [0.14.0]

### Added

- Settings navigation is now a grouped vertical rail (Look, Layout, Content, Advanced, System) built on Radix Tabs (`@radix-ui/react-tabs`, MIT), loaded only with the lazy settings chunk.
- Settings search highlights the matched text and explains results that match only a hidden keyword or the section name.
- The Websites section has an “Edit websites” action that closes settings and enters desktop editing.
- On screens 1024 px wide and up, the page behind settings stays at full brightness; the new Peek button slides the panel off-screen and leaves an edge handle to bring it back (click or Esc).

### Fixed

- Custom CSS drafts are kept when switching sections or closing and reopening settings, and each profile keeps its own draft; a page reload still clears them.
- The Custom CSS editor follows light, dark, high-contrast and custom themes, including a readable placeholder and gutter.
- The Custom CSS status says “Disabled” when custom CSS is switched off.
- Image and video upload controls only appear for those background types.
- The area grid rejects duplicate rows and removal of the shortcuts area, showing an inline message and keeping the text for correction.
- Settings search results are no longer unexplained: rows that match through a keyword show which keyword matched.

### Changed

- Renamed the sections to Theme, Areas & grid, Websites, Custom CSS, AI assistant and Backup & import.
- Corrected the Websites hint and the English website count (“1 website”, “2 websites”).
- No new permissions are requested. `@radix-ui/react-tabs` is the only new runtime dependency and is imported only by the lazy settings drawer, so startup JavaScript stays within the 480 KB budget.

## [0.13.2]

### Fixed

- Keep dragged icons under the cursor on the home page, inside folders, and when dragged out of a folder. Before, the icon jumped between grid slots, did not move over a folder, and was offset by about 250 px after leaving a folder.
- Stop the browser's long-press menu on touch screens from cancelling a drag and losing the drop.

### Changed

- Lift the dragged icon with a shadow, leave a dashed placeholder in its original spot, animate the drop into place (none with reduced motion), and highlight the folder under the icon more clearly.
- No new permissions are requested; the drag code still loads only when needed.

## [0.13.1]

### Added

- Show the bundled brand mark for any site in the Simple Icons catalogue: automatic icons match by domain, subdomain, and alias, covering 96 of 125 common sites in testing, up from 3.
- Draw the mark for brand-mode shortcuts that store only a brand name.

### Fixed

- Keep the favicon, then the letter, for sites without a catalogue mark.
- Leave manually chosen icons and their colours unchanged.

### Changed

- Load brand data on demand in small files, so brand marks add nothing to startup.
- Load the AI workbench text with the AI workbench, making startup lighter (startup JavaScript 479,749 → about 471,000 bytes).
- No new permissions are requested.

## [0.13.0]

### Added

- Drag shortcuts on the home page without entering edit mode; a placeholder shows the drop position, neighbouring icons shift, and folder tiles highlight while dragged over.
- Drag shortcuts into a folder tile, reorder them inside the folder dialog, and drag out of the dialog onto the desktop or into another folder.
- Cancel a drag with Esc or by dropping on nothing; each completed drag is one undo step.
- Drag with touch by holding, then moving.

### Fixed

- Pick up profile changes saved in another tab, so edits are no longer lost with a storage error in a tab that was already open.

### Changed

- Load the drag code only on interaction, so startup stays fast.
- No new permissions are requested.

## [0.12.4]

### Fixed

- Keep website icons visible on a new tab opened while another Promptab tab is open, or when two open at once. A cached icon that loaded before the component's mount reset was hidden forever, and 0.12.3's cached-is-final change made it permanent.
- Fall back to the letter instead of a broken-image glyph when a custom icon image cannot be decoded.
- Show the letter instead of a blank when a Lucide icon's name no longer exists.
- Keep showing a cached icon when its 7-day refresh fails because the site or network is down, and retry after 1 hour, then 6 hours, then 24 hours, instead of turning into a letter.

### Changed

- No new permissions are requested.

## [0.12.3]

### Fixed

- Cache website icons for real: a second new tab paints cached icons, letters, or brand marks on the first frame and does not re-probe sites.
- Keep cached icons visible while refreshing them after 7 days, and drop entries after 30 days.
- Back off failed icon lookups for 1 hour, then 6 hours, then 24 hours.
- Use Chromium's own favicon store again now that newer Chromium exposing `browser` is detected by its runtime URL instead of being mistaken for Firefox; this also stops Firefox-only permission fields from being sent on Chromium for weather and AI permission requests.

### Changed

- Move the icon cache to localStorage `mnt.iconCache:v3`, merge entries across tabs, and keep room for 1024 sites.
- No new permissions are requested.
- Include the 0.12.2 changes, which were not published to the store: automatic site names for new shortcuts, tidied bookmark import titles, and readable names for Infinity items.

## [0.12.2]

### Added

- Fill a new shortcut's name automatically from a bundled site list or the domain, such as `claude.ai` → Claude, without overwriting a name you typed.
- Tidy over-long or `Home | Site` titles when importing browser bookmarks while keeping short titles as-is.
- Give Infinity items with empty or URL-like names a readable name.

### Changed

- No new permissions are requested and no new network requests are made.

## [0.12.1]

### Added

- Use bundled known official icon URLs for ChatGPT, v0, AI Studio, ai.google.dev, NotebookLM, DeepSeek, Grok, Outlook, Reddit, TradingView, CoinMarketCap, IBKR, and Wealthsimple.
- Show bundled brand marks for Gemini, Instagram, YouTube, Dify, NotebookLM, v0, DeepSeek, and Google Maps when no good icon loads.

### Fixed

- Stop an upscaled browser favicon from outranking real high-resolution icons such as Reddit and YouTube.
- Keep Google Maps on www.google.com/maps from sharing the rest of Google's icon.
- Retry old icon failures with cache version 2 and a one-hour failure cache.

### Changed

- No new permissions are requested.

## [0.12.0]

### Added

- Open bookmark groups in accessible folder dialogs with keyboard navigation, focus restoration, and phone sized layouts.
- Improve Settings tab visibility by wrapping tabs in narrow windows.
- Load website icons progressively from browser-provided and same-origin sources, reject the default globe placeholder, upgrade to sharper icons, and cache results separately.

## [0.11.0]

### Added

- Choose from eleven search presets, including Brave Search, Startpage, Ecosia, Qwant, Kagi, and Perplexity; existing custom templates remain supported.
- Import Infinity New Tab backups locally, preview supported links, search engines, Todo and Note content, and add or replace imported sections with one-step undo.
- Start fresh installs with eight editable starter sites and embedded icons; remove unchanged starter sites from Settings with undo.

### Changed

- Present keyboard shortcuts in a themed dialog with focus trapping, restored focus, and keyboard or backdrop dismissal.

## [0.10.0]

### Added

- Use your own Anthropic or OpenAI API key to send a theme request directly, or continue using the manual copy-and-paste workflow. Keys remain in the interface session and provider charges may apply.
- Browse the public theme gallery, preview packs, and try themes in the hosted web app.
- Use the hosted web app as an installable PWA, with public guides and API references.
- Share themes by exporting portable theme packs. Save themes locally for later use.
- Use local image and video wallpapers, rotate selected wallpapers, and customize the new-tab experience with more layout and opening options.
- Open all links in a group, including large groups, with keyboard- and touch-friendly group menus.
- Add Todo, Note, Countdown, and optional weather widgets to the new tab.
- Opt in to browser profile sync across devices. Large local assets remain on the device.
- Find keyboard shortcuts, choose an accent on open, and use the accent palette cycle.
- Show week numbers, choose the week start, and optionally add a greeting transition line.
- Restore selected backup sections and undo the restore as one change.
- Build and temporarily install a separate Firefox extension package.

### Changed

- Load bookmark editing and the brand icon catalog on demand to reduce startup JavaScript.
- Improve mobile and dashboard layouts, profile sync handling, local recovery, and simultaneous wallpaper rotation.

## [0.9.0]

### Added

- First store release with customizable new tabs, shortcuts and bookmark groups, themes, layouts, profiles, local wallpapers, fonts, and CSS.
- AI-assisted theme creation with local validation, preview, undo, and manual copy-and-paste.
- Optional browser-bookmark import, backups, and settings in English and Simplified Chinese.
