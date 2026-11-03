import { exportThemePack } from '../ai/apply'
import { aiPackSchema, type AiPack } from '../ai/pack'
import type { ProfileV2 } from '../schema/profile'
import type { AsyncKeyValueBackend } from '../../storage/profiles'

export const MAX_SAVED_THEMES = 50
export const THEME_LIBRARY_KEY = 'themes:library:v1'
export type SavedTheme = { id: string; name: string; savedAt: string; pack: AiPack }

export function parseSavedThemes(value: unknown): SavedTheme[] {
  if (!Array.isArray(value) || value.length > MAX_SAVED_THEMES) throw new Error('Invalid theme library')
  const ids = new Set<string>()
  return value.map(item => {
    if (!item || typeof item !== 'object') throw new Error('Invalid saved theme')
    const theme = item as Record<string, unknown>
    if (typeof theme.id !== 'string' || !theme.id || ids.has(theme.id) || typeof theme.name !== 'string' || !theme.name.trim() || theme.name.length > 80 || typeof theme.savedAt !== 'string' || !Number.isFinite(Date.parse(theme.savedAt))) throw new Error('Invalid saved theme')
    const parsed = aiPackSchema.safeParse(theme.pack)
    if (!parsed.success) throw new Error('Invalid saved theme pack')
    ids.add(theme.id)
    return { id: theme.id, name: theme.name.trim(), savedAt: theme.savedAt, pack: { ...parsed.data, meta: { ...parsed.data.meta, name: theme.name.trim() } } }
  })
}

export function createThemeLibrary(backend: Pick<AsyncKeyValueBackend, 'get' | 'set'>, options: { id?: () => string; now?: () => string } = {}) {
  const id = options.id ?? (() => crypto.randomUUID())
  const now = options.now ?? (() => new Date().toISOString())
  async function read(): Promise<SavedTheme[]> {
    const raw = await backend.get(THEME_LIBRARY_KEY)
    if (raw === null) return []
    return parseSavedThemes(JSON.parse(raw))
  }
  async function write(themes: SavedTheme[]): Promise<void> {
    await backend.set(THEME_LIBRARY_KEY, JSON.stringify(parseSavedThemes(themes)))
  }
  return {
    read,
    write,
    async save(profile: ProfileV2, name: string): Promise<SavedTheme> {
      const trimmed = name.trim()
      if (!trimmed || trimmed.length > 80) throw new Error('Invalid theme name')
      const themes = await read()
      if (themes.length >= MAX_SAVED_THEMES) throw new Error('Theme library is full')
      const pack = exportThemePack(profile)
      pack.meta = { ...pack.meta, name: trimmed }
      const theme = { id: id(), name: trimmed, savedAt: now(), pack }
      await write([...themes, theme])
      return theme
    },
    async rename(themeId: string, name: string): Promise<void> {
      const trimmed = name.trim()
      if (!trimmed || trimmed.length > 80) throw new Error('Invalid theme name')
      const themes = await read()
      await write(themes.map(theme => theme.id === themeId ? { ...theme, name: trimmed, pack: { ...theme.pack, meta: { ...theme.pack.meta, name: trimmed } } } : theme))
    },
    async remove(themeId: string): Promise<void> {
      await write((await read()).filter(theme => theme.id !== themeId))
    },
  }
}
