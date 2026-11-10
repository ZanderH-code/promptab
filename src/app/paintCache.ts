import type { ProfileV2 } from '../core/schema/profile'
import type { Committed } from '../store/profile'

export const PAINT_CACHE_KEY = 'mnt:paint-cache:v1'
const MAX_BYTES = 512 * 1024

/** The last published profile, readable synchronously before chrome.storage answers. */
export type PaintCache = { version: 1; revision: number | null; activeProfileId: string; profile: ProfileV2 }

/** Stores only the active profile; history, drafts, previews and binary data never enter the cache. */
export function writePaintCache(committed: Committed, revision: number | null): void {
  try {
    const profile = committed.profiles[committed.activeProfileId]
    if (!profile) { localStorage.removeItem(PAINT_CACHE_KEY); return }
    const payload: PaintCache = { version: 1, revision, activeProfileId: committed.activeProfileId, profile }
    const json = JSON.stringify(payload)
    if (json.includes('data:') || new Blob([json]).size > MAX_BYTES) { localStorage.removeItem(PAINT_CACHE_KEY); return }
    localStorage.setItem(PAINT_CACHE_KEY, json)
  } catch { /* Storage may be unavailable or full; the cache is optional. */ }
}

/** Returns null for missing, corrupt, mismatched or foreign cache entries and never throws. */
export function readPaintCache(): PaintCache | null {
  try {
    const raw = localStorage.getItem(PAINT_CACHE_KEY)
    if (!raw) return null
    const value = JSON.parse(raw) as Partial<PaintCache> | null
    if (!value || typeof value !== 'object' || value.version !== 1) return null
    if (typeof value.activeProfileId !== 'string' || !value.profile || typeof value.profile !== 'object') return null
    if (value.profile.meta?.id !== value.activeProfileId) return null
    if (value.revision !== null && typeof value.revision !== 'number') return null
    return value as PaintCache
  } catch { return null }
}
