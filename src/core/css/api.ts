/**
 * The stable CSS API: the only selectors and variables that custom CSS and AI-written themes may rely on.
 * Removing or renaming anything here is a breaking change (bump CSS_API_VERSION); api.test.ts guards the list.
 */
export const CSS_API_VERSION = 1

export const CSS_API_CLASSES = [
  'mnt-root', 'mnt-header', 'mnt-settings-entry', 'mnt-layout', 'mnt-area', 'mnt-widget', 'mnt-widget-frame', 'mnt-widget-toolbar',
  'mnt-bookmark-tile', 'mnt-bookmark-list', 'mnt-bookmark-minimal', 'mnt-bookmark-card', 'mnt-bookmark-icon-only',
  'mnt-clock', 'mnt-date',
  'mnt-search', 'mnt-search-input',
  'mnt-group', 'mnt-group-title', 'mnt-group-title-hidden', 'mnt-link', 'mnt-link-icon', 'mnt-link-name',
  'mnt-folder', 'mnt-folder-preview', 'mnt-folder-name', 'mnt-folder-dialog', 'mnt-folder-backdrop',
] as const

/** Attribute selectors, as written in CSS. `github.com` is an example value of `data-link-host`. */
export const CSS_API_ATTRIBUTES = [
  '[data-area="clock"]', '[data-area="overview"]', '[data-area="bookmarks"]', '[data-area="banner"]', '[data-area="websites"]', '[data-area="divider"]', '[data-area="date"]', '[data-area="search"]', '[data-area="links"]',
  '[data-layout-template="stacked"]', '[data-layout-template="split"]', '[data-layout-template="top-grid"]', '[data-layout-template="websites"]', '[data-layout-template="zen"]', '[data-layout-template="dashboard"]', '[data-layout-template="icon-split"]', '[data-layout-template="banner"]',
  '[data-breakpoint="wide"]', '[data-breakpoint="medium"]', '[data-breakpoint="narrow"]', '[data-edit-mode]', '[data-widget-id="clock"]',
  '[data-widget="clock"]', '[data-widget="date"]', '[data-widget="search"]', '[data-widget="bookmarks"]', '[data-widget="greeting"]', '[data-widget="text"]', '[data-widget="spacer"]', '[data-widget="toolbar"]',
  '[data-link-host="github.com"]', '[data-folder]', '[data-theme-mode="dark"]', '[data-theme-mode="light"]',
] as const

/** Custom properties meant for reading in custom CSS (`var(--mnt-accent)`); colours are set through the theme, not here. */
export const CSS_API_VARIABLES = [
  '--mnt-bg', '--mnt-bg-elevated', '--mnt-surface', '--mnt-surface-hover', '--mnt-surface-active',
  '--mnt-text', '--mnt-text-muted', '--mnt-text-faint',
  '--mnt-accent', '--mnt-accent-soft', '--mnt-accent-strong', '--mnt-accent-text', '--mnt-on-accent',
  '--mnt-border', '--mnt-border-strong', '--mnt-danger',
  '--mnt-radius', '--mnt-glass', '--mnt-scale', '--mnt-density',
  '--mnt-font-display', '--mnt-font-ui', '--mnt-font-mono',
  '--mnt-text-xs', '--mnt-text-sm', '--mnt-text-md', '--mnt-text-lg', '--mnt-text-xl', '--mnt-text-clock',
  '--mnt-space-1', '--mnt-space-2', '--mnt-space-3', '--mnt-space-4', '--mnt-space-5', '--mnt-space-6', '--mnt-space-7', '--mnt-space-8', '--mnt-space-9',
  '--mnt-elev-1', '--mnt-elev-2', '--mnt-elev-3',
  '--mnt-dur-fast', '--mnt-dur-base', '--mnt-dur-slow', '--mnt-ease',
  '--mnt-icon-size', '--mnt-icon-radius', '--mnt-columns', '--mnt-content-width',
] as const
