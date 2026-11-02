import { migrateV1 } from '../../core/migrate/v1'
import { defaults } from '../../core/model'
import type { ProfileV2 } from '../../core/schema/profile'

export type ResettableTab = 'appearance' | 'background' | 'layout' | 'widgets' | 'search'
export const RESETTABLE: readonly string[] = ['appearance', 'background', 'layout', 'widgets', 'search']

const cache = new Map<string, Promise<ProfileV2>>()

/** The profile a fresh install gets (the migrated default settings). It never has assets, so no asset is written. */
export function defaultProfile(language: 'zh-CN' | 'en'): Promise<ProfileV2> {
  let found = cache.get(language)
  if (!found) {
    found = migrateV1({ ...defaults, language }, {
      id: () => 'default', now: () => new Date(0).toISOString(), language,
      add: () => Promise.reject(new Error('The default profile has no assets')),
    })
    cache.set(language, found)
  }
  return found
}

const areaNames = (areas: string[]) => new Set(areas.flatMap(row => row.trim().split(/\s+/)).filter(name => name !== '.'))

/**
 * Restores one settings section from the default profile `fresh`, leaving everything else untouched:
 * bookmarks, custom CSS, other widgets, profile identity, and every asset reference (wallpaper, bookmark images).
 */
export function resetSection(profile: ProfileV2, fresh: ProfileV2, tab: ResettableTab): ProfileV2 {
  const next = structuredClone(profile)
  next.meta.updatedAt = new Date().toISOString()
  const freshWidget = (type: ProfileV2['widgets'][number]['type']) => fresh.widgets.find(widget => widget.type === type)
  switch (tab) {
    case 'appearance': {
      next.theme = { ...fresh.theme, iconShape: profile.theme.iconShape, iconSize: profile.theme.iconSize }
      break
    }
    case 'background': {
      // Uploaded media stays available; "Remove wallpaper" is the explicit way to drop it.
      const image = profile.background.image && { ...profile.background.image, blur: 0, grayscale: 0, scale: 1, vignette: 0, position: 'center' }
      const video = profile.background.video && { ...profile.background.video, blur: 0, grayscale: 0 }
      next.background = { ...fresh.background, ...(image ? { image } : {}), ...(video ? { video } : {}), ...(profile.background.rotation ? { rotation: profile.background.rotation } : {}) }
      break
    }
    case 'layout': {
      next.layout = structuredClone(fresh.layout)
      next.theme.iconSize = fresh.theme.iconSize
      next.theme.iconShape = fresh.theme.iconShape
      const known = areaNames(fresh.layout.areas)
      for (const widget of next.widgets) {
        if (!known.has(widget.area)) widget.area = widget.type === 'bookmarks' ? 'bookmarks' : 'overview'
        if (widget.type === 'bookmarks') delete widget.props.maxColumns
      }
      break
    }
    case 'widgets': {
      for (const widget of next.widgets) {
        if (!['clock', 'date', 'search', 'bookmarks'].includes(widget.type)) continue
        const original = freshWidget(widget.type)
        if (original?.hidden === undefined) delete widget.hidden
        else widget.hidden = original.hidden
        if (widget.type === 'clock') delete widget.props.hour12
      }
      break
    }
    case 'search': {
      next.search = structuredClone(fresh.search)
      break
    }
  }
  return next
}
