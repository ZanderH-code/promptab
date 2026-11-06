# Changelog

All notable changes to Promptab are documented here. This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
