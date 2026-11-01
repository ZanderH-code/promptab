/**
 * The stable CSS API: the only selectors and variables that custom CSS and AI-written themes may rely on.
 * Removing or renaming anything here is a breaking change (bump CSS_API_VERSION); api.test.ts guards the list.
 */
export const CSS_API_VERSION = 1

export const CSS_API_CLASSES = [
  'mnt-root', 'mnt-header', 'mnt-settings-entry', 'mnt-widget',
  'mnt-clock', 'mnt-date',
  'mnt-search', 'mnt-search-input',
  'mnt-group', 'mnt-group-title', 'mnt-link', 'mnt-link-icon', 'mnt-link-name',
] as const

/** Attribute selectors, as written in CSS. `github.com` is an example value of `data-link-host`. */
export const CSS_API_ATTRIBUTES = [
  '[data-widget="clock"]', '[data-widget="search"]', '[data-widget="bookmarks"]',
  '[data-link-host="github.com"]', '[data-theme-mode="dark"]', '[data-theme-mode="light"]',
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
