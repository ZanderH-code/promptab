import type { ReactNode } from 'react'
import type { StoreApi } from 'zustand/vanilla'
import type { Settings } from '../../../core/model'
import type { ProfileV2 } from '../../../core/schema/profile'
import type { MessageKey, MessageRef, Translate } from '../../../i18n'
import type { ChangeKind } from '../../../store/history'
import type { ProfileStore } from '../../../store/profile'
import { Dropdown } from '../../../ui/Dropdown'
import type { ThemeMode } from '../themeApi'

export const TABS = ['appearance', 'background', 'layout', 'widgets', 'shortcuts', 'search', 'style', 'ai', 'data', 'about'] as const
export type TabId = (typeof TABS)[number]

/** One searchable setting. `keys` are the localized labels (including option names) the search matches against. */
export type Item = { id: string; group?: MessageKey; keys: MessageKey[]; words?: string[]; node: ReactNode }

export type Ctx = {
  t: Translate
  s: Settings
  /** Settings search is active: matched controls inside collapsed disclosures are shown. */
  searching?: boolean
  /** Object URL of the current wallpaper, when one is loaded. */
  wallpaperUrl?: string
  profile: ProfileV2
  mode: ThemeMode
  store: StoreApi<ProfileStore>
  change: (update: (profile: ProfileV2) => ProfileV2, kind?: ChangeKind) => void
  patch: (changes: Partial<Settings>) => void
  onWallpaperFile: (file?: File) => void
  onWallpaperFiles: (files: File[]) => void
  onWallpaperVideoFile: (file?: File) => void
  onWallpaperRemove: () => void
  onReset: () => void
  onError: (error: MessageRef) => void
  /** Safe mode is on: custom CSS is paused for this page. */
  safe: boolean
  /** Commit the running AI preview to the active profile (with the usual undo snapshot). */
  onApplyPreview: () => void
  /** Close the drawer and enter the desktop edit mode. */
  onEnterEditMode?: () => void
  layoutDrafts?: Partial<Record<'base' | 'narrow', Partial<Record<'areas' | 'columns' | 'rows', string>>>>
  onLayoutDraftsChange?: (drafts: NonNullable<Ctx['layoutDrafts']>) => void
  onGridCommit?: (profile: ProfileV2) => void
  movedWidgets?: string[]
  onMovedWidgets?: (messages: string[]) => void
}

export const touch = (profile: ProfileV2): ProfileV2 => ({ ...profile, meta: { ...profile.meta, updatedAt: new Date().toISOString() } })

export function Select({ ctx, label, value, options, onChange, wide }: { ctx: Ctx; label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void; wide?: boolean }) {
  return <Dropdown theme={ctx.mode} label={label} value={value} options={options} onChange={onChange} fullWidth={wide} />
}
