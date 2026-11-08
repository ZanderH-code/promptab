import { createStore } from 'zustand/vanilla'
import { parseProfileV2, type ProfileV2 } from '../core/schema/profile'
import type { SavedTheme } from '../core/themes/library'
import { MessageError } from '../i18n'
import { createHistory, recordChange, restoreSnapshot, setSnapshotPin, type ChangeKind, type History, type HistoryOptions, type ProfileHistory } from './history'

/** A profile removed by deletion or import; kept with its history until restored. */
export type ArchivedProfile = { profile: ProfileV2; history: ProfileHistory<ProfileV2>; archivedAt: number }
/** `archived` is omitted when empty so older readers see an unchanged shape. */
export type ProfileCollection = { activeProfileId: string; profiles: Record<string, ProfileV2>; archived?: Record<string, ArchivedProfile> }
export type ImportCollection = { activeProfileId: string; profiles: ProfileV2[] }
export interface ProfilePersistence {
  read(): Promise<{ revision: number; profiles: unknown; history: unknown } | null>
  write(data: { profiles: ProfileCollection; history: History<ProfileV2> }, expectedRevision: number | null): Promise<{ revision: number }>
}
type Transient = { profileId: string; profile: ProfileV2; /** Shown in the preview banner; previews without one are driven by their own panel. */ label?: string; showingOriginal?: boolean } | null
export interface ProfileStore {
  profiles: Record<string, ProfileV2>
  activeProfileId: string
  history: History<ProfileV2>
  archived: Record<string, ArchivedProfile>
  revision: number | null
  initialized: boolean
  draft: Transient
  preview: Transient
  initialize(): Promise<void>
  /** Re-reads persistence and adopts a newer revision published by another tab. */
  refresh(): Promise<void>
  updateProfile(id: string, update: (profile: ProfileV2) => ProfileV2, kind?: ChangeKind, retryOnConflict?: boolean): Promise<void>
  undo(id: string, expectedRevision?: number | null): Promise<void>
  setDraft(id: string, profile: ProfileV2): void
  setPreview(id: string, profile: ProfileV2, label?: string): void
  setPreviewOriginal(showingOriginal: boolean): void
  clearDraft(): void
  clearPreview(): void
  restoreSnapshot(id: string, snapshotId: string): Promise<void>
  pinSnapshot(id: string, snapshotId: string, pinned: boolean): Promise<void>
  createProfile(profile: ProfileV2): Promise<void>
  renameProfile(id: string, name: string): Promise<void>
  switchProfile(id: string): Promise<void>
  deleteProfile(id: string): Promise<void>
  resetProfile(id: string, profile: ProfileV2): Promise<void>
  importProfile(id: string, profile: ProfileV2): Promise<void>
  importPartial(id: string, profile: ProfileV2, themes?: { read(): Promise<SavedTheme[]>; write(value: SavedTheme[]): Promise<void>; incoming: SavedTheme[] }, expectedRevision?: number | null): Promise<void>
  importBackupCollection(incoming: ImportCollection, themes: { read(): Promise<SavedTheme[]>; write(value: SavedTheme[]): Promise<void>; incoming: SavedTheme[] } | undefined, expectedRevision: number | null): Promise<void>
  /** Brings an archived profile and its history back; fails if the ID is live. The active profile is unchanged. */
  restoreArchivedProfile(id: string): Promise<void>
  /** Replaces the whole collection; omitted live profiles are archived, retained ones get a pre-import snapshot. */
  importCollection(incoming: ImportCollection): Promise<void>
}

type Options = { persistence: ProfilePersistence; initialProfile: ProfileV2; now?: () => number; createId?: () => string; onExternalRefresh?: () => void }
export type Committed = Pick<ProfileStore, 'profiles' | 'activeProfileId' | 'history' | 'archived'>

function validateProfile(value: unknown, id?: string): ProfileV2 {
  const profile = parseProfileV2(value)
  if (id !== undefined && profile.meta.id !== id) throw new Error('Profile id cannot change')
  return profile
}

function advanceUpdatedAt(profile: ProfileV2, previous: ProfileV2, now: number): ProfileV2 {
  const previousTime = Date.parse(previous.meta.updatedAt)
  if (Date.parse(profile.meta.updatedAt) <= previousTime) profile.meta.updatedAt = new Date(Math.max(now, previousTime + 1)).toISOString()
  return profile
}

function validateHistoryEntry(entry: ProfileHistory<ProfileV2>, id: string): ProfileHistory<ProfileV2> {
  if (!entry || !Array.isArray(entry.snapshots) || !(entry.lastEditAt === null || (typeof entry.lastEditAt === 'number' && Number.isFinite(entry.lastEditAt)))) throw new Error('Invalid history entry')
  const snapshots = entry.snapshots.map(snapshot => {
    if (!snapshot || typeof snapshot.id !== 'string' || !snapshot.id || typeof snapshot.createdAt !== 'number' || !Number.isFinite(snapshot.createdAt) || typeof snapshot.pinned !== 'boolean' || !['edit', 'reset', 'import', 'restore', 'theme', 'preset'].includes(snapshot.kind)) throw new Error('Invalid snapshot')
    return { ...snapshot, profile: validateProfile(snapshot.profile, id) }
  })
  return { lastEditAt: entry.lastEditAt, snapshots }
}

/** Validates persisted profile data, including the archive. Throws on any inconsistency. */
export function validateStored(profilesValue: unknown, historyValue: unknown): Committed {
  if (!profilesValue || typeof profilesValue !== 'object' || !historyValue || typeof historyValue !== 'object') throw new Error('Invalid profile data')
  const collection = profilesValue as ProfileCollection
  if (!collection.profiles || typeof collection.profiles !== 'object' || Array.isArray(collection.profiles)) throw new Error('Invalid profiles')
  const profiles = Object.fromEntries(Object.entries(collection.profiles).map(([id, value]) => [id, validateProfile(value, id)]))
  if (!Object.hasOwn(profiles, collection.activeProfileId)) throw new Error('Invalid active profile')
  const source = (historyValue as History<ProfileV2>).profiles
  if (!source || typeof source !== 'object' || Array.isArray(source)) throw new Error('Invalid history')
  const history: History<ProfileV2> = { profiles: Object.fromEntries(Object.entries(source).map(([id, entry]) => {
    if (!Object.hasOwn(profiles, id)) throw new Error('Invalid history entry')
    return [id, validateHistoryEntry(entry, id)]
  })) }
  const rawArchive = collection.archived ?? {}
  if (!rawArchive || typeof rawArchive !== 'object' || Array.isArray(rawArchive)) throw new Error('Invalid archive')
  const archived: Record<string, ArchivedProfile> = Object.fromEntries(Object.entries(rawArchive).map(([id, item]) => {
    if (Object.hasOwn(profiles, id) || !item || typeof item.archivedAt !== 'number' || !Number.isFinite(item.archivedAt)) throw new Error('Invalid archived profile')
    return [id, { profile: validateProfile(item.profile, id), history: validateHistoryEntry(item.history, id), archivedAt: item.archivedAt }]
  }))
  return { profiles, activeProfileId: collection.activeProfileId, history, archived }
}

/**
 * Pure import planning shared by the store and the backup service.
 * Retained live profiles gain a pre-import snapshot (subject to history limits); omitted ones move,
 * with their history, to the archive; incoming IDs found in the archive take their history back.
 */
export function planImport(committed: Committed, incoming: ImportCollection, options: HistoryOptions): Committed {
  const profiles: Record<string, ProfileV2> = {}
  for (const item of incoming.profiles) {
    const profile = validateProfile(item)
    if (Object.hasOwn(profiles, profile.meta.id)) throw new Error('Duplicate profile id')
    profiles[profile.meta.id] = profile
  }
  if (!Object.keys(profiles).length || !Object.hasOwn(profiles, incoming.activeProfileId)) throw new Error('Invalid active profile')
  let history = structuredClone(committed.history)
  for (const profile of Object.values(committed.profiles)) history = recordChange(history, profile, 'import', options)
  const archived = structuredClone(committed.archived)
  for (const [id, profile] of Object.entries(committed.profiles)) {
    if (Object.hasOwn(profiles, id)) continue
    archived[id] = { profile: structuredClone(profile), history: history.profiles[id], archivedAt: options.now() }
    delete history.profiles[id]
  }
  for (const id of Object.keys(profiles)) {
    if (!Object.hasOwn(archived, id)) continue
    if (!Object.hasOwn(history.profiles, id)) history.profiles[id] = archived[id].history
    delete archived[id]
  }
  return { profiles, activeProfileId: incoming.activeProfileId, history, archived }
}

const persistable = (next: Committed): ProfileCollection => ({
  activeProfileId: next.activeProfileId,
  profiles: next.profiles,
  ...(Object.keys(next.archived).length ? { archived: next.archived } : {}),
})

/** Creates an independent vanilla Zustand store. Persistence and asset reconciliation are supplied by the caller. */
export function createProfileStore(options: Options) {
  const initial = validateProfile(options.initialProfile)
  const historyOptions = { now: options.now ?? Date.now, createId: options.createId ?? (() => crypto.randomUUID()) }
  let queue: Promise<void> = Promise.resolve()
  const undos = new Map<string, { profile: ProfileV2; collection?: Committed; themes?: { read(): Promise<SavedTheme[]>; write(value: SavedTheme[]): Promise<void>; before: SavedTheme[]; after: SavedTheme[] } }[]>()
  return createStore<ProfileStore>((set, get) => {
    const enqueue = (task: () => Promise<void>) => {
      const result = queue.then(task)
      queue = result.catch(() => {})
      return result
    }
    const existing = (id: string) => {
      const profiles = get().profiles
      if (!Object.hasOwn(profiles, id)) throw new Error('Profile not found')
      return profiles[id]
    }
    const adoptExternal = async () => {
      if (!get().initialized) return
      const saved = await options.persistence.read()
      if (!saved || saved.revision === get().revision) return
      if (!Number.isSafeInteger(saved.revision) || saved.revision < 1) throw new Error('Invalid revision')
      const committed = validateStored(saved.profiles, saved.history)
      // An in-session undo would restore a whole stale profile and erase the other tab's change.
      undos.clear()
      set({ ...committed, revision: saved.revision, draft: null, preview: null })
      options.onExternalRefresh?.()
    }
    const isRevisionConflict = (error: unknown) => error instanceof Error && error.message === 'Profile revision conflict'
    const commit = async (change: () => { next: Committed; after?: () => void; themes?: { read(): Promise<SavedTheme[]>; write(value: SavedTheme[]): Promise<void>; expected: SavedTheme[]; value: SavedTheme[] } } | Promise<{ next: Committed; after?: () => void; themes?: { read(): Promise<SavedTheme[]>; write(value: SavedTheme[]): Promise<void>; expected: SavedTheme[]; value: SavedTheme[] } }>) => {
      if (!get().initialized) throw new Error('Store not initialized')
      const { next, after, themes } = await change()
      if (themes && JSON.stringify(await themes.read()) !== JSON.stringify(themes.expected)) throw new Error('Theme library changed')
      let saved: { revision: number }
      let profileWriteStarted = false
      try {
        if (themes) await themes.write(themes.value)
        profileWriteStarted = true
        saved = await options.persistence.write(structuredClone({ profiles: persistable(next), history: next.history }), get().revision)
      } catch (error) {
        if (themes) {
          if (profileWriteStarted) {
            let actualRevision: number | null
            try { actualRevision = (await options.persistence.read())?.revision ?? null }
            catch (readError) { throw new AggregateError([error, readError], 'Cannot determine whether profile save succeeded; theme rollback skipped') }
            if (actualRevision !== get().revision) throw new AggregateError([error], 'Profile publication outcome is uncertain; theme rollback skipped')
          }
          try {
            const actualThemes = await themes.read()
            if (JSON.stringify(actualThemes) !== JSON.stringify(themes.value) && JSON.stringify(actualThemes) !== JSON.stringify(themes.expected)) throw new Error('Theme library changed during restore')
            await themes.write(themes.expected)
          } catch (rollback) { throw new AggregateError([error, rollback], 'Profile save and theme rollback failed') }
        }
        throw error
      }
      if (!Number.isSafeInteger(saved.revision) || saved.revision < 1) throw new Error('Invalid revision returned by persistence')
      set({ ...next, revision: saved.revision })
      after?.()
    }
    // A functional update re-runs on the freshly read state; a write built from stale state must not.
    const transaction = (change: Parameters<typeof commit>[0], retryOnConflict = false) => enqueue(async () => {
      try { await commit(change) }
      catch (error) {
        if (!isRevisionConflict(error)) throw error
        await adoptExternal()
        if (!retryOnConflict) throw new MessageError('error.changedInAnotherTab')
        try { await commit(change) }
        catch (retryError) {
          if (!isRevisionConflict(retryError)) throw retryError
          await adoptExternal()
          throw new MessageError('error.changedInAnotherTab')
        }
      }
    })
    const current = (): Committed => ({ profiles: get().profiles, activeProfileId: get().activeProfileId, history: get().history, archived: get().archived })
    const update = (id: string, fn: (p: ProfileV2) => ProfileV2, kind: ChangeKind = 'edit', retryOnConflict = false) => transaction(() => {
      const old = existing(id)
      const profile = advanceUpdatedAt(validateProfile(fn(structuredClone(old)), id), old, historyOptions.now())
      const next = { ...current(), profiles: { ...get().profiles, [id]: profile }, history: recordChange(get().history, old, kind, historyOptions) }
      return { next, after: () => { undos.set(id, [...(undos.get(id) ?? []), { profile: structuredClone(old) }]) } }
    }, retryOnConflict)
    return {
      profiles: { [initial.meta.id]: initial }, activeProfileId: initial.meta.id, history: createHistory(), archived: {}, revision: null, initialized: false, draft: null, preview: null,
      initialize: () => enqueue(async () => {
        if (get().initialized) return
        const saved = await options.persistence.read()
        if (saved) {
          if (!Number.isSafeInteger(saved.revision) || saved.revision < 1) throw new Error('Invalid revision')
          set({ ...validateStored(saved.profiles, saved.history), revision: saved.revision, initialized: true })
        } else set({ initialized: true })
      }),
      refresh: () => enqueue(adoptExternal),
      updateProfile: update,
      undo: (id, expectedRevision) => transaction(() => {
        if (expectedRevision !== undefined && get().revision !== expectedRevision) throw new Error('Profile revision conflict')
        const old = existing(id)
        const stack = undos.get(id)
        if (!stack?.length) throw new Error('Nothing to undo')
        const entry = stack[stack.length - 1]
        const profile = advanceUpdatedAt(structuredClone(entry.profile), old, historyOptions.now())
        const themes = entry.themes && { ...entry.themes, expected: entry.themes.after, value: entry.themes.before }
        return { next: entry.collection ? structuredClone(entry.collection) : { ...current(), profiles: { ...get().profiles, [id]: profile }, history: recordChange(get().history, old, 'restore', historyOptions) }, themes, after: () => { stack.pop() } }
      }),
      setDraft: (id, value) => { existing(id); set({ draft: { profileId: id, profile: validateProfile(value, id) } }) },
      setPreview: (id, value, label) => { existing(id); set({ preview: { profileId: id, profile: validateProfile(value, id), ...(label ? { label } : {}) } }) },
      setPreviewOriginal: showingOriginal => set(state => state.preview ? { preview: { ...state.preview, showingOriginal } } : state),
      clearDraft: () => set({ draft: null }), clearPreview: () => set({ preview: null }),
      restoreSnapshot: (id, snapshotId) => transaction(() => {
        const old = existing(id)
        const restored = restoreSnapshot(get().history, old, snapshotId, historyOptions)
        const profile = advanceUpdatedAt(validateProfile(restored.profile, id), old, historyOptions.now())
        return { next: { ...current(), history: restored.history, profiles: { ...get().profiles, [id]: profile } }, after: () => { undos.set(id, [...(undos.get(id) ?? []), { profile: structuredClone(old) }]) } }
      }),
      pinSnapshot: (id, snapshotId, pinned) => transaction(() => { existing(id); return { next: { ...current(), history: setSnapshotPin(get().history, id, snapshotId, pinned) } } }),
      createProfile: value => transaction(() => {
        const profile = validateProfile(value)
        if (Object.hasOwn(get().profiles, profile.meta.id) || Object.hasOwn(get().archived, profile.meta.id)) throw new Error('Profile already exists')
        return { next: { ...current(), profiles: { ...get().profiles, [profile.meta.id]: profile } } }
      }),
      renameProfile: (id, name) => update(id, p => {
        const meta = { ...p.meta, name }
        delete meta.builtinName
        return { ...p, meta }
      }),
      switchProfile: id => transaction(() => { existing(id); return { next: { ...current(), activeProfileId: id } } }),
      deleteProfile: id => transaction(() => {
        existing(id)
        const profiles = { ...get().profiles }; delete profiles[id]
        const ids = Object.keys(profiles)
        if (!ids.length) throw new Error('Cannot delete last profile')
        const histories = { ...get().history.profiles }; delete histories[id]
        const archived = { ...get().archived, [id]: { profile: structuredClone(get().profiles[id]), history: get().history.profiles[id] ?? { snapshots: [], lastEditAt: null }, archivedAt: historyOptions.now() } }
        return { next: { profiles, activeProfileId: get().activeProfileId === id ? ids[0] : get().activeProfileId, history: { profiles: histories }, archived }, after: () => { undos.delete(id); set(state => ({ draft: state.draft?.profileId === id ? null : state.draft, preview: state.preview?.profileId === id ? null : state.preview })) } }
      }),
      resetProfile: (id, profile) => update(id, () => profile, 'reset'),
      importProfile: (id, profile) => update(id, () => profile, 'import'),
      importBackupCollection: (incoming, library, expectedRevision) => transaction(async () => {
        if (get().revision !== expectedRevision) throw new Error('Profile revision conflict')
        const before = structuredClone(current())
        const next = planImport(before, incoming, historyOptions)
        const previousThemes = library ? await library.read() : undefined
        const themes = library && previousThemes ? { ...library, expected: previousThemes, value: library.incoming } : undefined
        const undoThemes = library && previousThemes ? { read: library.read, write: library.write, before: structuredClone(previousThemes), after: structuredClone(library.incoming) } : undefined
        return { next, themes, after: () => {
          undos.clear()
          undos.set(next.activeProfileId, [{ profile: structuredClone(next.profiles[next.activeProfileId]), collection: before, themes: undoThemes }])
          set({ draft: null, preview: null })
        } }
      }),
      importPartial: (id, value, library, expectedRevision) => transaction(async () => {
        if (expectedRevision !== undefined && get().revision !== expectedRevision) throw new Error('Profile revision conflict')
        const old = existing(id)
        const profile = advanceUpdatedAt(validateProfile(value, id), old, historyOptions.now())
        const before = library ? await library.read() : undefined
        const themes = library && before ? { ...library, expected: before, value: library.incoming } : undefined
        const undoThemes = library && before ? { read: library.read, write: library.write, before: structuredClone(before), after: structuredClone(library.incoming) } : undefined
        return {
          next: { ...current(), profiles: { ...get().profiles, [id]: profile }, history: recordChange(get().history, old, 'import', historyOptions) },
          themes,
          after: () => { undos.set(id, [...(undos.get(id) ?? []), { profile: structuredClone(old), themes: undoThemes }]) },
        }
      }),
      restoreArchivedProfile: id => transaction(() => {
        const { archived, profiles, history } = get()
        if (!Object.hasOwn(archived, id)) throw new Error('Archived profile not found')
        if (Object.hasOwn(profiles, id)) throw new Error('Profile already exists')
        const rest = { ...archived }; delete rest[id]
        return { next: { ...current(), profiles: { ...profiles, [id]: structuredClone(archived[id].profile) }, history: { profiles: { ...history.profiles, [id]: structuredClone(archived[id].history) } }, archived: rest } }
      }),
      importCollection: incoming => transaction(() => ({
        next: planImport(current(), incoming, historyOptions),
        after: () => { undos.clear(); set({ draft: null, preview: null }) },
      })),
    }
  })
}
