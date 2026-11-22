# Changelog

All notable changes to Promptab are documented here. This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.24.1]

### Changed

- The AI assistant's prompt now describes every widget option, area style and alignment, and explains how to fix a repeated grid row. In tests with three AI providers, 94–98% of generated themes were valid on the first try and all of them after one fix round.
- Google Drive sync (Chrome, Edge and Firefox sharing one profile through a hidden app folder in your own Google Drive) is built in, but switched off in builds without a Google sign-in client. This release does not include it, and its permissions are unchanged.

### Fixed

- With "change wallpaper on every new tab", several tabs opened at once no longer show the same image, and a new tab no longer shows the first image of the set for a moment before switching.
- Restoring a backup also checks that shortcut tile images are images.
- The safe-mode and AI-preview banners wrap cleanly on narrow phones instead of squeezing their text into thin columns.

## [0.24.0]

### Changed

- Each widget is placed from its own card under Settings → Widgets: area, order, size and alignment sit next to the widget's other options. They used to be in a separate block per widget on Areas & grid, and todo, note, countdown and weather widgets had them in both places.
- Areas & grid starts with the page-wide controls (alignment, content width, gap, columns, icon size and shape). Each area's style controls are folded into one disclosure that opens by itself when the area already has custom styles; the tab is about a quarter of its old length.
## [0.23.1]

### Changed

- The weather widget names your current location (for example "上海市, 中国") instead of showing "Current location". The coordinates are sent once to BigDataCloud's free reverse geocoder, a new optional host (`https://api.bigdatacloud.net/*`) asked for in the same click as the location; the name is saved with the widget. Locations saved earlier get their name after the next refresh click.

### Fixed

- The Chrome Web Store rejected 0.23.0 because its review could not find `storage` in use: every storage call went through an indirect `browser ?? chrome` lookup. Storage and bookmarks are now reached as `chrome.storage.*` / `chrome.bookmarks.*` (or `browser.*` on Firefox).
- Browser bookmark import is offered in Chromium again. Chromium defines the bookmarks API only after the optional permission is granted, so the import button was hidden before anyone could grant it.

## [0.23.0]

### Changed

- The AI panel works in three steps: describe the look (with style ideas to start from), have an AI write it (copy the prompt into any AI chat, or generate with your own API key), then review, preview and apply it. After a reply you can ask the AI for changes or fixes without starting over.
- The AI prompt now includes a short outline of your page (light or dark, background type, layout and widget types; no website names or addresses), and "Let the AI build on my current theme and CSS" is on by default. The chosen method, provider and model are remembered on this device; the API key is not.
- Direct Anthropic requests default to `claude-opus-5-5` with server-side fallbacks, and a declined request gets its own message. The Anthropic SDK loads only when a request is sent.
- Palettes that would be invisible in the current light or dark mode switch the mode.
- Interface motion: overlays fade in, pressed tiles give a little, the settings drawer slides in, folded content fades in, and theme previews cross-fade. All of it follows the system reduce-motion setting and the profile's Reduce motion preference.
- Brand icon data ships once, so the package is about 5 MB smaller. Startup JavaScript is 443,473 bytes raw, under the unchanged 480,000-byte budget.

### Fixed

- Every argument of URL-taking CSS functions is checked, and unsafe theme variable and font values are kept off the page.
- Reduce motion changes apply at once; edit-mode selection counts only websites that still exist; emoji letter icons stay whole; a long press is cancelled when a tile goes away; hourly wallpaper rotation advances by one at month ends; only Google domains count as the Google search preset.
- Settings writes queued together no longer overwrite each other, browser sync runs in one tab at a time and merges pulled profiles with edits made meanwhile, and the sync switch shows the chosen position at once.
- First run loads the starter websites while the migration runs.

## [0.22.0]

### Added

- Importing a nightTab backup reproduces its look: the layout width, padding and gutter, header items in order with their sizes, clock and date parts with accent separators, the search field, joined toolbar buttons (in the header or a corner), groups as headed sections with an "Open all" text button, website blocks with wide and tall tiles, their own colours, images, borders, alignment and rotation, the accent line, the hover lift and shadow, and the address strip. The README setups of nightTab 7 match side by side once the fonts and media files they use are added.
- An imported look is a starting point, not a fixed copy. Colours, corner radius, shadow, fonts, Interface scale, each widget's size and the background settings keep working on it, and nightTab's own values (layout width, padding, gutter, plate opacity, accent line, hover zoom and hover shadow) appear as "nightTab" options under Theme.
- Font Awesome icons in a nightTab backup are drawn from a bundled subset (Font Awesome Free 5.14.0, CC BY 4.0) instead of falling back to favicons.
- Website editor: "Tile look" sets a tile's size (wide, tall, large), content position, own plate and accent colours, plate opacity, a tile image, border width, icon and name side by side or stacked, name first, hidden name or icon, icon and name size, the space between them, rotation and offset. Every value a nightTab import sets can be changed or reset here.
- Websites can show as blocks, groups as headed sections with an "Open all" button, and the time can be spelled in words.
- Toolbar: a "Buttons on a plate" look and a corner position. Search: options to name the engine in the box and to filter websites as you type.
- Background: an accent tint over an image or video wallpaper; opacity and vignette for videos.

### Changed

- Widget size goes up to 5×.
- The import notes name every Google font and remote image or video the backup uses, so they can be saved and added under Theme → Fonts, Background, or the website's Tile image.
- Startup JavaScript is 449,176 bytes raw, under the unchanged 480,000-byte budget.

## [0.21.0]

### Fixed

- AI themes no longer come out boxed or cluttered. The prompt now says what each element actually is and how the page already looks, and lists the common mistakes; the bundled example no longer shows CSS that causes them. Before this, AI replies often framed the whole websites area in one box, drew a second box inside the search bar, doubled the group heading line, or spread Chinese dates with wide letter-spacing.
- The AI review flags CSS that applies but looks wrong, and "Copy feedback for the AI" sends those notes back so the AI can fix its own reply.
- The custom CSS editor warns about the same mistakes as you type, and its completions explain what each class is, in the interface language.
- Copying the prompt pack opens step 2, ready for the reply.

### Changed

- Startup JavaScript is 479,230 bytes raw, under the unchanged 480,000-byte budget.

## [0.20.0]

### Fixed

- Typing in settings fields and the note widget no longer drops characters; text is saved after a short pause, on leaving the field, and works with Chinese input methods.
- The todo widget is usable on the page: add a task with Enter, tick it instantly, delete it, or clear completed tasks. Checkboxes are round ticks instead of switches.
- Countdowns use the local date, say "Tomorrow" and "Yesterday", and update at midnight; a new countdown starts a week from today.
- Widget settings show one card per widget with move up/down, a greeting name, and a spacer height. A new widget scrolls into view with its first field focused; only one greeting can be added.
- Group dialogs (add, rename, delete) are proper modals with a page backdrop; an empty name shows a message. Moving a website can create a new group, also when there is only one group.
- Deleting a website no longer asks for confirmation; the undo toast restores it.
- Search focuses the box when empty and opens results in a new tab with Ctrl/⌘ + Enter or a middle click.
- Escape closes Settings even after clicking inside it; page shortcuts (like `e` for edit mode) are paused while Settings or a dialog is open.
- The onboarding card no longer jumps on hover or disappears when adding a website is cancelled; with websites present it says "Add website".
- Background settings show only the uploader for the chosen type.

### Changed

- Startup JavaScript is 479,217 bytes raw, under the unchanged 480,000-byte budget.

## [0.19.0]

### Fixed

- The weather widget works on its own: once a city or location is chosen it loads on every new tab, shows the last forecast immediately and refreshes in the background (30-minute cache). Before, it stayed empty until "Update weather" was pressed each time.
- City search shows matching places while you type, with arrow keys, Enter and Escape; each result shows its region and country so same-named cities can be told apart.
- Location errors say whether the browser blocked access, the device has no location, or the request timed out, and suggest searching instead.
- An empty weather card offers "Choose city", which opens its settings; refresh is a small icon button.
- In edit mode the dashed widget outlines no longer overlap, and a weather card under the search box keeps a gap.

### Changed

- Choosing a weather city or location asks once for both Open-Meteo hosts. The privacy policy now describes the automatic forecast load.

## [0.18.0]

0.17.0 was built but not submitted to Edge Add-ons (an earlier submission was still in progress), so 0.18.0 is the first store release with both batches.

### Fixed

- The website dialog says "Add website" when adding, focuses the address field, closes with Escape, keeps keyboard focus inside and returns it afterwards. It is announced as a dialog.
- Edit mode no longer covers each website with a dark blob of buttons: edit, move, delete and drag sit in one row under the name, selection is a small check on the icon, and the group header buttons match the page. Raw area names (overview, search…) and doubled outlines are gone.
- "Add group" in the edit toolbar opens the group name dialog; the duplicate "Add group" and "Done" buttons inside the grid are removed.
- The onboarding card can be dismissed with "Not now", sits below the starter websites instead of pushing them off the first screen, and points to Settings → Backup & import.
- Settings header buttons line up.

### Changed

- "Open websites in a new tab" and "Lift websites on hover" moved from Theme to Websites; "Enable keyboard shortcuts" moved to About.
- Scale is shown as a percentage (100%) instead of "1 ×".
- Areas & grid names each widget (Clock, Date, Search box…) and leaves showing or hiding widgets to the Widgets section.
- AI assistant steps use a chevron, and the documentation link uses the accent colour.
- The user's sites are called websites (网站) throughout; "bookmarks" now only means browser or nightTab bookmarks.
- Startup JavaScript is 476,971 bytes raw, under the unchanged 480,000-byte budget.
- No new permissions are requested.

## [0.17.0]

### Added

- Importing a nightTab backup now brings its setup as well as its theme: clock parts, 12/24-hour time and separator; date parts, order, ordinal, week start and separator; greeting name and the "it's…" line; the search engine (presets, YouTube, Giphy and custom engines) and its new-tab option; layout alignment, overall size and page title; block or list bookmarks, new-tab links, lift on hover and address display; and random or cycling accent colours. Widgets nightTab hid stay hidden.
- Settings → About → Tab title sets the text on the browser tab; leave it empty for the default.
- Websites → Show the address on hover adds the site address under each website on hover or keyboard focus, for every bookmark style.

### Fixed

- nightTab bookmarks with Font Awesome brand icons (GitHub, YouTube and so on) no longer appear blank: they use the automatic website icon. Common generic icons map to the built-in set.
- nightTab settings that cannot be imported (web wallpapers, saved nightTab themes, clocks and dates written in words) are listed as import notes instead of being dropped silently.

### Changed

- Startup JavaScript is 476,575 bytes raw, under the unchanged 480,000-byte budget.
- No new permissions are requested.

## [0.16.1]

### Fixed

- Returning profiles paint from the last committed snapshot instead of showing the loading screen while storage opens.
- The onboarding card renders with the first grid, removing the 154 px page re-centre (CLS 0.0688 → 0.0000).
- Image wallpapers paint a cached preview with the first content frame, then replace it with the full asset without a layout shift.

### Changed

- Starter sites load only for the first-run migration, reclaiming about 5.6 KB of startup JavaScript.
- Startup JavaScript is 475,816 bytes raw / 151,265 gzip, under the unchanged 480,000-byte budget.
- No new permissions are requested.

## [0.16.0]

### Added

- Widget settings are grouped into cards that fold away; Search and Shortcuts stay single rows.
- Every settings row that differs from the default shows a dot and its own reset, so one changed value can be restored without resetting the whole section.
- Destructive settings actions ask in one accessible dialog that says exactly what is reset and what is kept. Cancel has focus, and the existing undo toast still restores the previous profile.
- The AI assistant's three steps fold, putting the review and apply controls within reach.

### Fixed

- The confirmation dialog returns focus to the control that opened it and keeps Tab inside itself.
- A newly selected settings section opens at its top instead of keeping the previous scroll position.
- Labels beside text fields and dropdowns now focus or open their control.

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
