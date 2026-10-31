export type HistoryProfile = { meta: { id: string } }
export type ChangeKind = 'edit' | 'reset' | 'import' | 'restore' | 'theme' | 'preset'
export type HistoryOptions = { now: () => number; createId: () => string }
export type Snapshot<T> = { id: string; createdAt: number; kind: ChangeKind; pinned: boolean; profile: T }
export type ProfileHistory<T> = { snapshots: Snapshot<T>[]; lastEditAt: number | null }
export type History<T> = { profiles: Record<string, ProfileHistory<T>> }

const EDIT_WINDOW_MS = 30_000
const MAX_UNPINNED = 30

export function createHistory<T extends HistoryProfile>(): History<T> {
  return { profiles: {} }
}

function trim<T>(snapshots: Snapshot<T>[]): Snapshot<T>[] {
  let unpinned = 0
  return snapshots.filter(snapshot => snapshot.pinned || ++unpinned <= MAX_UNPINNED)
}

/** Capture the state immediately before a change. Edit windows slide with each edit. */
export function recordChange<T extends HistoryProfile>(history: History<T>, profile: T, kind: ChangeKind, options: HistoryOptions): History<T> {
  const id = profile.meta.id
  const previous = Object.hasOwn(history.profiles, id) ? history.profiles[id] : undefined
  const now = options.now()
  const coalesce = kind === 'edit' && previous?.lastEditAt != null && now >= previous.lastEditAt && now - previous.lastEditAt < EDIT_WINDOW_MS
  const snapshots = coalesce ? previous.snapshots : trim([{ id: options.createId(), createdAt: now, kind, pinned: false, profile: structuredClone(profile) }, ...(previous?.snapshots ?? [])])
  return { profiles: { ...history.profiles, [id]: { snapshots, lastEditAt: kind === 'edit' ? now : null } } }
}

/** Pinning protects a snapshot; unpinning immediately reapplies the retention limit. */
export function setSnapshotPin<T extends HistoryProfile>(history: History<T>, profileId: string, snapshotId: string, pinned: boolean): History<T> {
  const entry = Object.hasOwn(history.profiles, profileId) ? history.profiles[profileId] : undefined
  if (!entry || !entry.snapshots.some(snapshot => snapshot.id === snapshotId)) throw new Error('Snapshot not found')
  const snapshots = trim(entry.snapshots.map(snapshot => snapshot.id === snapshotId ? { ...snapshot, pinned } : snapshot))
  return { profiles: { ...history.profiles, [profileId]: { snapshots, lastEditAt: null } } }
}

/** Restore a copy and first save the current profile as a separate snapshot. */
export function restoreSnapshot<T extends HistoryProfile>(history: History<T>, current: T, snapshotId: string, options: HistoryOptions): { history: History<T>; profile: T } {
  const entry = Object.hasOwn(history.profiles, current.meta.id) ? history.profiles[current.meta.id] : undefined
  const snapshot = entry?.snapshots.find(item => item.id === snapshotId)
  if (!snapshot) throw new Error('Snapshot not found')
  const profile = structuredClone(snapshot.profile)
  return { history: recordChange(history, current, 'restore', options), profile }
}
