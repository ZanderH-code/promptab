# Third-party notices

This file records the runtime packages bundled into the extension. Versions are read from the installed packages used for the 0.9.0 release. Each package remains under its own license; this notice does not replace those licenses.

| Package | Version | License |
| --- | ---: | --- |
| React / React DOM | 19.1.1 | MIT |
| `@radix-ui/react-select` | 2.4.1 | MIT |
| `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` | 6.3.1 / 10.0.0 / 3.2.2 | MIT |
| `@codemirror/autocomplete` | 6.20.4 | MIT |
| `@codemirror/commands` | 6.11.1 | MIT |
| `@codemirror/lang-css` | 6.3.1 | MIT |
| `@codemirror/language` | 6.13.1 | MIT |
| `@codemirror/lint` | 6.9.7 | MIT |
| `@codemirror/state` | 6.7.6 | MIT |
| `@codemirror/view` | 6.43.15 | MIT |
| `zod` | 4.6.7 | MIT |
| `zustand` | 5.0.8 | MIT |
| `css-tree` | 3.2.1 | MIT |
| `jsonc-parser` | 3.3.1 | MIT |
| `idb` | 8.0.3 | ISC |
| `lucide-react` | 1.66.0 | ISC |
| `simple-icons` | 16.36.0 | CC0-1.0 |
| Font Awesome Free icons (a subset of 80 icon paths, in `src/core/nighttab/fontAwesome.ts`) | 5.14.0 | CC BY 4.0 (icons) |
| Material Design icons (a few toolbar and button glyphs, drawn inline) | — | Apache-2.0 |
| `@fontsource/barlow-condensed`, `@fontsource/cormorant-garamond`, `@fontsource/outfit` | 5.3.0 | SIL Open Font License 1.1 |

The complete license text for dependencies is available in their published packages and their source repositories. The font license files used by this project are in [`licenses/fonts/`](fonts/).

Simple Icons' brand paths are CC0-licensed. Brand names and marks remain the trademarks of their respective owners; the icons are used only to identify or point to the corresponding websites and do not imply endorsement.

Font Awesome Free 5.14.0 by Fonticons, Inc. (https://fontawesome.com), icons licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Promptab embeds the outline paths of a subset of its solid and brand icons, unmodified, to show the icons that nightTab backups name; the attribution is also kept in the source file. Brand icons remain the trademarks of their owners.

Material Design icons by Google, licensed under the Apache License 2.0 (https://www.apache.org/licenses/LICENSE-2.0). Promptab draws a few of their glyphs (the accent, add, edit, settings and open-in-browser icons) as inline SVG paths.

## Scope

This list covers direct runtime dependencies in `package.json`. Development-only tooling is not bundled into the extension and is intentionally omitted.
