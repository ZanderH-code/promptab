import { useEffect, useSyncExternalStore } from 'react'
import type { StoreApi } from 'zustand/vanilla'
import type { ProfileStore } from '../store/profile'
import type { ProfileV2 } from '../core/schema/profile'
import { debounceSync, decideSyncChanges, mergeSyncedProfile, readSyncStorage, toSyncPayload, writeSyncStorage, type SyncPayload } from '../core/sync'
import { syncText, type SyncMessage } from '../core/syncMessages'
import type { Language } from '../i18n'
import { extensionApi, type ExtensionStorageArea } from '../platform/extension'

type Storage = {
  local: ExtensionStorageArea & { remove(keys: string | string[]): Promise<void> }
  sync: ExtensionStorageArea & { remove(keys: string | string[]): Promise<void> }
  onChanged?: { addListener(fn: ChangeListener): void; removeListener(fn: ChangeListener): void }
}
type ChangeListener = (changes: Record<string, unknown>, area: string) => void
type Base = { local: string; cloud: string }
type Snapshot = { available: boolean; ready: boolean; enabled: boolean; busy: boolean; conflict: boolean; canUndo: boolean; status: SyncMessage | null }
const ENABLED = 'mnt.sync.enabled'
const BASE = 'mnt.sync.base'
let snapshot: Snapshot = { available: false, ready: false, enabled: false, busy: false, conflict: false, canUndo: false, status: null }
const listeners = new Set<() => void>()
const set = (patch: Partial<Snapshot>) => { snapshot = { ...snapshot, ...patch }; listeners.forEach(fn => fn()) }
export const useSyncStatus = () => useSyncExternalStore(fn => { listeners.add(fn); return () => { listeners.delete(fn) } }, () => snapshot)

// Local identity and timestamps differ between devices and do not represent synced content.
function revision(payload: SyncPayload): string {
  const { id: _id, createdAt: _createdAt, name: _name, builtinName: _builtinName, updatedAt: _updatedAt, ...meta } = payload.profile.meta
  return JSON.stringify({ ...payload.profile, meta })
}
let controller: ReturnType<typeof createController> | undefined
export const syncActions = {
  enable: (value: boolean) => controller?.enable(value),
  keepLocal: () => controller?.keepLocal(),
  pullCloud: () => controller?.pullCloud(),
  undo: () => controller?.undo(),
  deleteCloud: () => controller?.deleteCloud(),
  dismiss: () => set({ status: null }),
}

function createController(store: StoreApi<ProfileStore>, api: Storage) {
  let stopped = false
  let base: Base | null = null
  let conflict: SyncPayload | null = null
  let undoProfile: ProfileV2 | null = null
  let undoRevision: string | null = null
  let queue = Promise.resolve()
  const current = () => { const state = store.getState(); return state.profiles[state.activeProfileId] }
  const saveBase = async (local: string, cloud: string) => { const next = { local, cloud }; await api.local.set({ [BASE]: next }); base = next }
  const fail = (error: unknown) => set({ status: String(error).toLowerCase().includes('quota') ? 'quota' : 'error' })
  const run = (task: () => Promise<void>) => {
    queue = queue.then(async () => { if (stopped) return; set({ busy: true }); try { await task() } catch (error) { if (!stopped) fail(error) } finally { if (!stopped) set({ busy: false }) } })
    return queue
  }
  const publish = async () => {
    const profile = current()
    const rev = revision(toSyncPayload(profile))
    await writeSyncStorage(api.sync, profile)
    await saveBase(rev, rev)
    set({ status: 'saved' })
  }
  const pull = async (cloud: SyncPayload) => {
    const before = current()
    const merged = mergeSyncedProfile(before, cloud)
    await store.getState().updateProfile(before.meta.id, () => merged)
    undoProfile = before
    undoRevision = revision(toSyncPayload(current()))
    await saveBase(undoRevision, revision(cloud))
    conflict = null
    set({ conflict: false, canUndo: true, status: 'pulled' })
  }
  const reconcile = async () => {
    if (!snapshot.enabled || conflict) return
    const cloud = await readSyncStorage(api.sync)
    const localRev = revision(toSyncPayload(current()))
    if (!cloud) {
      // A missing cloud after a previous successful sync may be an intentional deletion.
      if (base) { set({ status: 'missing' }); return }
      await publish(); return
    }
    const cloudRev = revision(cloud)
    const decision = decideSyncChanges(base, localRev, cloudRev)
    if (decision === 'unchanged') { if (!base || localRev === cloudRev) await saveBase(localRev, cloudRev); return }
    if (decision === 'conflict') { conflict = cloud; set({ conflict: true, status: null }); return }
    if (decision === 'pull') await pull(cloud)
    else await publish()
  }
  const timer = debounceSync(() => { void run(reconcile) })
  const schedule = timer.schedule
  const unsubscribe = store.subscribe((state, previous) => {
    if (state.profiles[state.activeProfileId] !== previous.profiles[previous.activeProfileId] || state.activeProfileId !== previous.activeProfileId) schedule()
  })
  const changed: ChangeListener = (changes, area) => { if (area === 'sync' && Object.keys(changes).some(key => key === 'mnt.sync.manifest')) schedule() }
  api.onChanged?.addListener(changed)
  void run(async () => {
    const values = await api.local.get([ENABLED, BASE])
    const raw = values[BASE] as Base | undefined
    base = raw && typeof raw.local === 'string' && typeof raw.cloud === 'string' ? raw : null
    set({ available: true, enabled: values[ENABLED] === true, ready: true })
    await reconcile()
  })
  return {
    enable: (value: boolean) => run(async () => {
      if (!value) {
        await api.local.set({ [ENABLED]: false }); conflict = null; undoProfile = null
        set({ enabled: false, conflict: false, canUndo: false, status: 'disabled' }); return
      }
      // Inspect the cloud before enabling; existing data always requires a choice.
      const cloud = await readSyncStorage(api.sync)
      await api.local.set({ [ENABLED]: true })
      set({ enabled: true, status: null })
      if (cloud) { conflict = cloud; set({ conflict: true }) }
      else { base = null; await api.local.remove(BASE); await publish() }
    }),
    keepLocal: () => run(async () => {
      if (!conflict || !snapshot.enabled) return
      const latest = await readSyncStorage(api.sync)
      if (!latest || revision(latest) !== revision(conflict)) { conflict = latest; set({ conflict: !!latest, status: 'error' }); return }
      await publish(); conflict = null; set({ conflict: false })
    }),
    pullCloud: () => run(async () => { if (!conflict || !snapshot.enabled) return; const latest = await readSyncStorage(api.sync); if (!latest) throw new Error('Cloud missing'); await pull(latest) }),
    undo: () => run(async () => {
      if (!undoProfile || !snapshot.enabled) return
      if (current().meta.id !== undoProfile.meta.id || revision(toSyncPayload(current())) !== undoRevision) { undoProfile = null; set({ canUndo: false, status: 'undoUnavailable' }); return }
      const before = undoProfile
      await store.getState().updateProfile(before.meta.id, profile => mergeSyncedProfile(profile, toSyncPayload(before)))
      undoProfile = null; set({ canUndo: false })
      // Reconcile first so a concurrent remote edit is never silently overwritten.
      await reconcile()
      if (!conflict) set({ status: 'undone' })
    }),
    deleteCloud: () => run(async () => {
      const values = await api.sync.get(null)
      const keys = Object.keys(values).filter(key => key === 'mnt.sync.manifest' || key.startsWith('mnt.sync.chunk.'))
      if (keys.length) await api.sync.remove(keys)
      await api.local.set({ [ENABLED]: false })
      await api.local.remove(BASE)
      base = null; conflict = null; undoProfile = null
      set({ enabled: false, conflict: false, canUndo: false, status: 'deleted' })
    }),
    stop: () => { stopped = true; timer.cancel(); unsubscribe(); api.onChanged?.removeListener(changed) },
  }
}

export function SyncRuntime({ store }: { store: StoreApi<ProfileStore> }) {
  useEffect(() => {
    const api = extensionApi()?.storage as { local?: Storage['local']; sync?: Storage['sync']; onChanged?: Storage['onChanged'] } | undefined
    const local = api?.local, sync = api?.sync
    if (!local || !sync) { set({ available: false, ready: true }); return }
    controller = createController(store, { local, sync, onChanged: api.onChanged })
    return () => { controller?.stop(); controller = undefined }
  }, [store])
  return null
}

export function SyncApp({ store, language }: { store: StoreApi<ProfileStore>; language: Language }) {
  const state = useSyncStatus()
  const text = (key: SyncMessage) => syncText(language, key)
  return <>
    <SyncRuntime store={store} />
    {(state.conflict || state.status || state.canUndo) && <div className="mnt-banner" role="status">
      <span>{text(state.conflict ? 'conflict' : state.status ?? 'pulled')}</span>
      {state.conflict && <><button type="button" disabled={state.busy} onClick={() => void syncActions.keepLocal()}>{text('keepLocal')}</button><button type="button" disabled={state.busy} onClick={() => void syncActions.pullCloud()}>{text('pullCloud')}</button></>}
      {state.canUndo && !state.conflict && <button type="button" disabled={state.busy} onClick={() => void syncActions.undo()}>{text('undo')}</button>}
      {!state.conflict && <button type="button" onClick={syncActions.dismiss} aria-label={language === 'en' ? 'Dismiss' : '关闭'}>×</button>}
    </div>}
  </>
}
