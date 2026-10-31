import { createStore } from 'zustand/vanilla'
import { parseProfileV2, type ProfileV2 } from '../core/schema/profile'
import { createHistory, recordChange, restoreSnapshot, setSnapshotPin, type ChangeKind, type History } from './history'

export type ProfileCollection = { activeProfileId: string; profiles: Record<string, ProfileV2> }
export interface ProfilePersistence {
  read(): Promise<{ revision: number; profiles: unknown; history: unknown } | null>
  write(data: { profiles: ProfileCollection; history: History<ProfileV2> }, expectedRevision: number | null): Promise<{ revision: number }>
}
type Transient = { profileId: string; profile: ProfileV2 } | null
export interface ProfileStore {
  profiles: Record<string, ProfileV2>
  activeProfileId: string
  history: History<ProfileV2>
  revision: number | null
  initialized: boolean
  draft: Transient
  preview: Transient
  initialize(): Promise<void>
  updateProfile(id: string, update: (profile: ProfileV2) => ProfileV2, kind?: ChangeKind): Promise<void>
  undo(id: string): Promise<void>
  setDraft(id: string, profile: ProfileV2): void
  setPreview(id: string, profile: ProfileV2): void
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
}

type Options = { persistence: ProfilePersistence; initialProfile: ProfileV2; now?: () => number; createId?: () => string }
type Committed = Pick<ProfileStore, 'profiles' | 'activeProfileId' | 'history'>

function validateProfile(value: unknown, id?: string): ProfileV2 {
  const profile = parseProfileV2(value)
  if (id !== undefined && profile.meta.id !== id) throw new Error('Profile id cannot change')
  return profile
}

function validateStored(profilesValue: unknown, historyValue: unknown): Committed {
  if (!profilesValue || typeof profilesValue !== 'object' || !historyValue || typeof historyValue !== 'object') throw new Error('Invalid profile data')
  const collection = profilesValue as ProfileCollection
  if (!collection.profiles || typeof collection.profiles !== 'object' || Array.isArray(collection.profiles)) throw new Error('Invalid profiles')
  const profiles = Object.fromEntries(Object.entries(collection.profiles).map(([id, value]) => [id, validateProfile(value, id)]))
  if (!Object.hasOwn(profiles, collection.activeProfileId)) throw new Error('Invalid active profile')
  const source = (historyValue as History<ProfileV2>).profiles
  if (!source || typeof source !== 'object' || Array.isArray(source)) throw new Error('Invalid history')
  const history: History<ProfileV2> = { profiles: Object.fromEntries(Object.entries(source).map(([id, entry]) => {
    if (!Object.hasOwn(profiles, id) || !entry || !Array.isArray(entry.snapshots) || !(entry.lastEditAt === null || (typeof entry.lastEditAt === 'number' && Number.isFinite(entry.lastEditAt)))) throw new Error('Invalid history entry')
    const snapshots = entry.snapshots.map(snapshot => {
      if (!snapshot || typeof snapshot.id !== 'string' || !snapshot.id || typeof snapshot.createdAt !== 'number' || !Number.isFinite(snapshot.createdAt) || typeof snapshot.pinned !== 'boolean' || !['edit', 'reset', 'import', 'restore', 'theme', 'preset'].includes(snapshot.kind)) throw new Error('Invalid snapshot')
      return { ...snapshot, profile: validateProfile(snapshot.profile, id) }
    })
    return [id, { lastEditAt: entry.lastEditAt, snapshots }]
  })) }
  return { profiles, activeProfileId: collection.activeProfileId, history }
}

/** Creates an independent vanilla Zustand store. Persistence and asset reconciliation are supplied by the caller. */
export function createProfileStore(options: Options) {
  const initial = validateProfile(options.initialProfile)
  const historyOptions = { now: options.now ?? Date.now, createId: options.createId ?? (() => crypto.randomUUID()) }
  let queue: Promise<void> = Promise.resolve()
  const undos = new Map<string, ProfileV2[]>()
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
    const transaction = (change: () => { next: Committed; after?: () => void }) => enqueue(async () => {
      if (!get().initialized) throw new Error('Store not initialized')
      const { next, after } = change()
      const saved = await options.persistence.write(structuredClone({ profiles: { activeProfileId: next.activeProfileId, profiles: next.profiles }, history: next.history }), get().revision)
      if (!Number.isSafeInteger(saved.revision) || saved.revision < 1) throw new Error('Invalid revision returned by persistence')
      set({ ...next, revision: saved.revision })
      after?.()
    })
    const current = (): Committed => ({ profiles: get().profiles, activeProfileId: get().activeProfileId, history: get().history })
    const update = (id: string, fn: (p: ProfileV2) => ProfileV2, kind: ChangeKind = 'edit') => transaction(() => {
      const old = existing(id)
      const profile = validateProfile(fn(structuredClone(old)), id)
      const next = { ...current(), profiles: { ...get().profiles, [id]: profile }, history: recordChange(get().history, old, kind, historyOptions) }
      return { next, after: () => { undos.set(id, [...(undos.get(id) ?? []), structuredClone(old)]) } }
    })
    return {
      profiles: { [initial.meta.id]: initial }, activeProfileId: initial.meta.id, history: createHistory(), revision: null, initialized: false, draft: null, preview: null,
      initialize: () => enqueue(async () => {
        if (get().initialized) return
        const saved = await options.persistence.read()
        if (saved) {
          if (!Number.isSafeInteger(saved.revision) || saved.revision < 1) throw new Error('Invalid revision')
          set({ ...validateStored(saved.profiles, saved.history), revision: saved.revision, initialized: true })
        } else set({ initialized: true })
      }),
      updateProfile: update,
      undo: id => transaction(() => {
        const old = existing(id)
        const stack = undos.get(id)
        if (!stack?.length) throw new Error('Nothing to undo')
        const profile = stack[stack.length - 1]
        return { next: { ...current(), profiles: { ...get().profiles, [id]: profile }, history: recordChange(get().history, old, 'restore', historyOptions) }, after: () => { stack.pop() } }
      }),
      setDraft: (id, value) => { existing(id); set({ draft: { profileId: id, profile: validateProfile(value, id) } }) },
      setPreview: (id, value) => { existing(id); set({ preview: { profileId: id, profile: validateProfile(value, id) } }) },
      clearDraft: () => set({ draft: null }), clearPreview: () => set({ preview: null }),
      restoreSnapshot: (id, snapshotId) => transaction(() => {
        const old = existing(id)
        const restored = restoreSnapshot(get().history, old, snapshotId, historyOptions)
        return { next: { ...current(), history: restored.history, profiles: { ...get().profiles, [id]: validateProfile(restored.profile, id) } }, after: () => { undos.set(id, [...(undos.get(id) ?? []), structuredClone(old)]) } }
      }),
      pinSnapshot: (id, snapshotId, pinned) => transaction(() => { existing(id); return { next: { ...current(), history: setSnapshotPin(get().history, id, snapshotId, pinned) } } }),
      createProfile: value => transaction(() => {
        const profile = validateProfile(value)
        if (Object.hasOwn(get().profiles, profile.meta.id)) throw new Error('Profile already exists')
        return { next: { ...current(), profiles: { ...get().profiles, [profile.meta.id]: profile } } }
      }),
      renameProfile: (id, name) => update(id, p => ({ ...p, meta: { ...p.meta, name } })),
      switchProfile: id => transaction(() => { existing(id); return { next: { ...current(), activeProfileId: id } } }),
      deleteProfile: id => transaction(() => {
        existing(id)
        const profiles = { ...get().profiles }; delete profiles[id]
        const ids = Object.keys(profiles)
        if (!ids.length) throw new Error('Cannot delete last profile')
        const histories = { ...get().history.profiles }; delete histories[id]
        return { next: { profiles, activeProfileId: get().activeProfileId === id ? ids[0] : get().activeProfileId, history: { profiles: histories } }, after: () => { undos.delete(id); set(state => ({ draft: state.draft?.profileId === id ? null : state.draft, preview: state.preview?.profileId === id ? null : state.preview })) } }
      }),
      resetProfile: (id, profile) => update(id, () => profile, 'reset'),
      importProfile: (id, profile) => update(id, () => profile, 'import'),
    }
  })
}
