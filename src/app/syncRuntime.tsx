import { useEffect, useSyncExternalStore } from 'react'
import type { StoreApi } from 'zustand/vanilla'
import type { ProfileStore } from '../store/profile'
import type { ProfileV2 } from '../core/schema/profile'
import { browserSyncBackend, debounceSync, decideSyncChanges, mergeSyncedProfile, toSyncPayload, type CloudBackend, type SyncPayload } from '../core/sync'
import { googleDriveBackend } from '../core/gdrive'
import { syncText, type SyncMessage, type SyncProvider } from '../core/syncMessages'
import type { Language } from '../i18n'
import { extensionStorage, type ExtensionStorageArea } from '../platform/extension'
import { GOOGLE_CLIENT_ID, connectGoogleDrive, createGoogleAuth, extensionIdentity, extensionSession } from '../platform/googleAuth'

type LocalArea = ExtensionStorageArea & { remove(keys: string | string[]): Promise<void> }
type SessionArea = { get(keys: string): Promise<Record<string, unknown>>; set(items: Record<string, unknown>): Promise<void> }
/** Each provider keeps its own last agreed revision pair; `session` limits the sign-in notice to once per browser session. */
type Storage = { local: LocalArea; cloud: CloudBackend; provider?: SyncProvider; session?: SessionArea }
type Base = { local: string; cloud: string }
// `requested` is the switch position the person just chose, shown until the queued change has run.
type Snapshot = {
  available: boolean; ready: boolean; enabled: boolean; requested: boolean | null; busy: boolean; conflict: boolean; canUndo: boolean; status: SyncMessage | null
  provider: SyncProvider; providers: SyncProvider[]; needsSignIn: boolean
}
const ENABLED = 'mnt.sync.enabled'
const PROVIDER = 'mnt.sync.provider'
const BASES: Record<SyncProvider, string> = { browser: 'mnt.sync.base', gdrive: 'mnt.sync.base.gdrive' }
const SIGN_IN_NOTICE = 'mnt.gdrive.signInNoticed'
const SYNC_LOCK = 'mnt.sync'
type SyncLock = (task: () => Promise<void>) => Promise<void>
// Every open tab runs a controller; one at a time may read the cloud, the base and the profile and act on them.
const browserLock: SyncLock = async task => { if (typeof navigator !== 'undefined' && navigator.locks) await navigator.locks.request(SYNC_LOCK, task); else await task() }
const transient = { conflict: false, canUndo: false, status: null, needsSignIn: false, requested: null, busy: false } satisfies Partial<Snapshot>
let snapshot: Snapshot = { available: false, ready: false, enabled: false, provider: 'browser', providers: [], ...transient }
const listeners = new Set<() => void>()
const set = (patch: Partial<Snapshot>) => { snapshot = { ...snapshot, ...patch }; listeners.forEach(fn => fn()) }
export const useSyncStatus = () => useSyncExternalStore(fn => { listeners.add(fn); return () => { listeners.delete(fn) } }, () => snapshot)

// Local identity and timestamps differ between devices and do not represent synced content.
function revision(payload: SyncPayload): string {
  const { id: _id, createdAt: _createdAt, name: _name, builtinName: _builtinName, updatedAt: _updatedAt, ...meta } = payload.profile.meta
  return JSON.stringify({ ...payload.profile, meta })
}
let controller: ReturnType<typeof createSyncController> | undefined
let chooseProvider: ((provider: SyncProvider) => Promise<void>) | undefined
export const syncActions = {
  enable: (value: boolean) => controller?.enable(value),
  /** Only while sync is off: the switch then turns on sync with the chosen provider. */
  setProvider: (provider: SyncProvider) => snapshot.enabled ? undefined : chooseProvider?.(provider),
  signIn: () => controller?.signIn(),
  keepLocal: () => controller?.keepLocal(),
  pullCloud: () => controller?.pullCloud(),
  undo: () => controller?.undo(),
  deleteCloud: () => controller?.deleteCloud(),
  dismiss: () => set({ status: null }),
}

export function createSyncController(store: StoreApi<ProfileStore>, api: Storage, lock: SyncLock = browserLock) {
  let stopped = false
  let base: Base | null = null
  let conflict: SyncPayload | null = null
  let undoProfile: ProfileV2 | null = null
  let undoRevision: string | null = null
  let queue = Promise.resolve()
  const provider = api.provider ?? 'browser'
  const BASE = BASES[provider]
  const current = () => { const state = store.getState(); return state.profiles[state.activeProfileId] }
  const saveBase = async (local: string, cloud: string) => { const next = { local, cloud }; await api.local.set({ [BASE]: next }); base = next }
  // Another tab may have published or pulled since this one last looked.
  const readBase = async () => {
    const raw = (await api.local.get(BASE))[BASE] as Base | undefined
    base = raw && typeof raw.local === 'string' && typeof raw.cloud === 'string' ? raw : null
  }
  const needSignIn = async () => {
    set({ needsSignIn: true })
    // Every new tab would otherwise announce the same expired sign-in; Settings keeps showing the button.
    if (api.session) {
      if ((await api.session.get(SIGN_IN_NOTICE))[SIGN_IN_NOTICE] === true) return
      await api.session.set({ [SIGN_IN_NOTICE]: true })
    }
    set({ status: 'reauth' })
  }
  const fail = async (error: unknown) => {
    const name = error instanceof Error ? error.name : ''
    if (name === 'DriveAuthError') return needSignIn()
    if (name === 'DriveScopeError') return set({ status: 'driveScope' })
    // Offline or a slow network: the next tab visit or local edit tries again.
    if (name === 'TimeoutError' || (name === 'TypeError' && typeof navigator !== 'undefined' && navigator.onLine === false)) return
    set({ status: String(error).toLowerCase().includes('quota') ? 'quota' : 'error' })
  }
  const run = (task: () => Promise<void>) => {
    queue = queue.then(() => lock(async () => { if (stopped) return; set({ busy: true }); try { await task() } catch (error) { if (!stopped) await fail(error) } finally { if (!stopped) set({ busy: false }) } }))
    return queue
  }
  // Click-time sign-in and permission prompts run outside the cross-tab lock so other tabs are never held up by a dialog.
  const connect = () => (api.cloud.connect?.() ?? Promise.resolve(true)).catch(async error => { await fail(error); return false })
  const publish = async () => {
    const profile = current()
    const rev = revision(toSyncPayload(profile))
    await api.cloud.write(profile)
    await saveBase(rev, rev)
    set({ status: 'saved' })
  }
  const pull = async (cloud: SyncPayload) => {
    let before: ProfileV2 | null = null
    // Merge inside the store queue so a local edit committed meanwhile is kept, not replaced.
    await store.getState().updateProfile(current().meta.id, profile => { before = structuredClone(profile); return mergeSyncedProfile(profile, cloud) })
    undoProfile = before
    undoRevision = revision(toSyncPayload(current()))
    await saveBase(undoRevision, revision(cloud))
    conflict = null
    set({ conflict: false, canUndo: true, status: 'pulled' })
  }
  const reconcile = async () => {
    if (conflict) return
    // Another tab may have turned sync off or switched provider since this controller started.
    const values = await api.local.get([ENABLED, PROVIDER])
    const active = values[ENABLED] === true && (values[PROVIDER] ?? 'browser') === provider
    if (active !== snapshot.enabled) set({ enabled: active })
    if (!active) return
    // Adopt what other tabs committed so this tab never pushes or pulls on top of an old profile.
    await store.getState().refresh()
    await readBase()
    const cloud = await api.cloud.read()
    const localRev = revision(toSyncPayload(current()))
    if (!cloud) {
      // A missing cloud after a previous successful sync may be an intentional deletion.
      if (base) { set({ status: 'missing' }); return }
      await publish(); return
    }
    const cloudRev = revision(cloud)
    const decision = decideSyncChanges(base, localRev, cloudRev)
    if (decision === 'unchanged') {
      if (!base || (localRev === cloudRev && (base.local !== localRev || base.cloud !== cloudRev))) await saveBase(localRev, cloudRev)
      return
    }
    if (decision === 'conflict') { conflict = cloud; set({ conflict: true, status: null }); return }
    if (decision === 'pull') await pull(cloud)
    else await publish()
  }
  const timer = debounceSync(() => { void run(reconcile) })
  const schedule = timer.schedule
  const unsubscribe = store.subscribe((state, previous) => {
    if (state.profiles[state.activeProfileId] !== previous.profiles[previous.activeProfileId] || state.activeProfileId !== previous.activeProfileId) schedule()
  })
  const unwatch = api.cloud.watch?.(schedule)
  void run(async () => {
    set({ available: true, ready: true })
    await reconcile()
  })
  return {
    enable: (value: boolean) => { set({ requested: value }); return (value ? connect() : Promise.resolve(true)).then(ok => { if (ok) return run(async () => {
      if (!value) {
        await api.local.set({ [ENABLED]: false }); conflict = null; undoProfile = null
        set({ enabled: false, conflict: false, canUndo: false, status: 'disabled' }); return
      }
      // Inspect the cloud before enabling; existing data always requires a choice.
      const cloud = await api.cloud.read()
      await api.local.set({ [ENABLED]: true, [PROVIDER]: provider })
      set({ enabled: true, status: null })
      if (cloud) { conflict = cloud; set({ conflict: true }) }
      else { base = null; await api.local.remove(BASE); await publish() }
    }) }).finally(() => { if (snapshot.requested === value) set({ requested: null }) }) },
    signIn: () => connect().then(ok => { if (ok) return run(async () => {
      // The person may have picked another Google account, so the cloud copy needs a fresh choice, never a silent pull.
      base = null
      await api.local.remove(BASE)
      if (api.session) await api.session.set({ [SIGN_IN_NOTICE]: false })
      set({ needsSignIn: false, status: null })
      await reconcile()
    }) }),
    keepLocal: () => run(async () => {
      if (!conflict || !snapshot.enabled) return
      const latest = await api.cloud.read()
      if (!latest || revision(latest) !== revision(conflict)) { conflict = latest; set({ conflict: !!latest, status: 'error' }); return }
      await publish(); conflict = null; set({ conflict: false })
    }),
    pullCloud: () => run(async () => { if (!conflict || !snapshot.enabled) return; const latest = await api.cloud.read(); if (!latest) throw new Error('Cloud missing'); await pull(latest) }),
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
      await api.cloud.remove()
      await api.local.set({ [ENABLED]: false })
      await api.local.remove(BASE)
      base = null; conflict = null; undoProfile = null
      set({ enabled: false, conflict: false, canUndo: false, needsSignIn: false, status: 'deleted' })
    }),
    stop: () => { stopped = true; timer.cancel(); unsubscribe(); unwatch?.() },
  }
}

function driveBackend(): CloudBackend {
  const auth = createGoogleAuth(extensionIdentity()!, extensionSession())
  return googleDriveBackend(auth, { connect: () => connectGoogleDrive(auth), events: { document, window } })
}

export function SyncRuntime({ store }: { store: StoreApi<ProfileStore> }) {
  useEffect(() => {
    const api = extensionStorage() as { local?: LocalArea; sync?: LocalArea; onChanged?: Parameters<typeof browserSyncBackend>[1] } | undefined
    const local = api?.local, sync = api?.sync
    const providers: SyncProvider[] = []
    if (sync) providers.push('browser')
    if (GOOGLE_CLIENT_ID && extensionIdentity()) providers.push('gdrive')
    if (!local || !providers.length) { set({ available: false, ready: true }); return }
    let generation = 0
    const start = async (chosen?: SyncProvider) => {
      const mine = ++generation
      const stored = chosen ?? (await local.get(PROVIDER))[PROVIDER]
      if (mine !== generation) return
      const provider = providers.find(item => item === stored) ?? providers[0]
      controller?.stop()
      // A new controller must not inherit the previous provider's conflict, undo or notices.
      set({ ...transient, ready: false, enabled: false, provider, providers })
      const cloud = provider === 'gdrive' ? driveBackend() : browserSyncBackend(sync!, api.onChanged)
      controller = createSyncController(store, { local, cloud, provider, session: extensionSession() })
    }
    chooseProvider = async provider => { await local.set({ [PROVIDER]: provider }); await start(provider) }
    // Another tab switched provider: follow it so this tab never keeps writing to the old cloud.
    const changed = (changes: Record<string, unknown>, area: string) => {
      if (area === 'local' && Object.hasOwn(changes, PROVIDER) && (changes[PROVIDER] as { newValue?: unknown })?.newValue !== snapshot.provider) void start()
    }
    api.onChanged?.addListener(changed)
    void start()
    return () => { generation++; chooseProvider = undefined; api.onChanged?.removeListener(changed); controller?.stop(); controller = undefined }
  }, [store])
  return null
}

export function SyncApp({ store, language }: { store: StoreApi<ProfileStore>; language: Language }) {
  const state = useSyncStatus()
  const text = (key: SyncMessage) => syncText(language, key, state.provider)
  return <>
    <SyncRuntime store={store} />
    {(state.conflict || state.status || state.canUndo) && <div className="mnt-banner" role="status">
      <span>{text(state.conflict ? 'conflict' : state.status ?? 'pulled')}</span>
      {state.conflict && <><button type="button" disabled={state.busy} onClick={() => void syncActions.keepLocal()}>{text('keepLocal')}</button><button type="button" disabled={state.busy} onClick={() => void syncActions.pullCloud()}>{text('pullCloud')}</button></>}
      {state.status === 'reauth' && <button type="button" disabled={state.busy} onClick={() => void syncActions.signIn()}>{text('signIn')}</button>}
      {state.canUndo && !state.conflict && <button type="button" disabled={state.busy} onClick={() => void syncActions.undo()}>{text('undo')}</button>}
      {!state.conflict && <button type="button" onClick={syncActions.dismiss} aria-label={text('dismiss')}>×</button>}
    </div>}
  </>
}
