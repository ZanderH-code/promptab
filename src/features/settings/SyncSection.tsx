import { useEffect, useRef, useState } from 'react'
import type { StoreApi } from 'zustand/vanilla'
import type { Settings } from '../../core/model'
import { decideSyncConflict, mergeSyncedProfile, readSyncStorage, writeSyncStorage, type SyncPayload } from '../../core/sync'
import { syncText, type SyncMessage } from '../../core/syncMessages'
import type { ProfileStore } from '../../store/profile'
import { Toggle } from './controls'

type Props = { settings: Settings; store?: StoreApi<ProfileStore> }
type SyncStorage = {
  get(keys: string[] | null): Promise<Record<string, unknown>>
  set(items: Record<string, string>): Promise<void>
  remove(keys: string[]): Promise<void>
}
type LocalStorage = { get(key: string): Promise<Record<string, unknown>>; set(items: Record<string, boolean>): Promise<void> }
type ChangeEvent = { addListener(listener: (changes: Record<string, { newValue?: unknown }>, area: string) => void): void; removeListener(listener: (changes: Record<string, { newValue?: unknown }>, area: string) => void): void }
type ExtensionStorage = { local: LocalStorage; sync: SyncStorage; onChanged?: ChangeEvent }

function extensionStorage(): ExtensionStorage | undefined {
  return (window.chrome as unknown as { storage?: ExtensionStorage } | undefined)?.storage
}

export function SyncSection({ settings, store }: Props) {
  const message = (key: SyncMessage) => syncText(settings.language, key)
  const [enabled, setEnabled] = useState(false)
  const [ready, setReady] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [conflict, setConflict] = useState<SyncPayload | null>(null)
  const [canUndo, setCanUndo] = useState(false)
  const resolving = useRef(false)
  const api = extensionStorage()

  useEffect(() => {
    let alive = true
    if (!api) { setReady(true); return }
    void api.local.get('mnt.sync.enabled').then(async value => {
      if (!alive) return
      const active = value['mnt.sync.enabled'] === true
      setEnabled(active)
      if (!active || !store) { setInitialized(true); setReady(true); return }
      const local = store.getState().profiles[store.getState().activeProfileId]
      const cloud = await readSyncStorage(api.sync)
      if (!alive) return
      if (cloud && cloud.profile.meta.id === local.meta.id && decideSyncConflict(local.meta.updatedAt, cloud.profile.meta.updatedAt) === 'pull-cloud') setConflict(cloud)
      else await writeSyncStorage(api.sync, local)
      setInitialized(true)
      setReady(true)
    }).catch(() => { if (alive) { setReady(true); setStatus(message('error')) } })
    return () => { alive = false }
  }, [api, settings.language, store])

  useEffect(() => {
    if (!ready || !initialized || !enabled || !api || !store || conflict) return
    let closed = false
    const publish = async () => {
      if (resolving.current) return
      const state = store.getState()
      const profile = state.profiles[state.activeProfileId]
      if (!profile) return
      try { await writeSyncStorage(api.sync, profile); if (!closed) setStatus(message('saved')) }
      catch (error) { if (!closed) setStatus(String(error).toLowerCase().includes('quota') ? message('quota') : message('error')) }
    }
    const unsubscribe = store.subscribe((state, previous) => {
      const profile = state.profiles[state.activeProfileId]
      const prior = previous.profiles[previous.activeProfileId]
      if (profile && (profile.meta.updatedAt !== prior?.meta.updatedAt || state.activeProfileId !== previous.activeProfileId)) void publish()
    })
    const changed = (changes: Record<string, { newValue?: unknown }>, area: string) => {
      if (area !== 'sync' || !Object.hasOwn(changes, 'mnt.sync.manifest')) return
      void readSyncStorage(api.sync).then(cloud => {
        if (!cloud || closed) return
        const local = store.getState().profiles[store.getState().activeProfileId]
        if (cloud.profile.meta.id !== local.meta.id) return
        if (decideSyncConflict(local.meta.updatedAt, cloud.profile.meta.updatedAt) === 'pull-cloud') setConflict(cloud)
      }).catch(() => { if (!closed) setStatus(message('error')) })
    }
    api.onChanged?.addListener(changed)
    return () => { closed = true; unsubscribe(); api.onChanged?.removeListener(changed) }
  }, [api, conflict, enabled, initialized, ready, settings.language, store])

  const setSyncEnabled = async (next: boolean) => {
    if (!api || !store) return
    setBusy(true)
    setStatus('')
    try {
      await api.local.set({ 'mnt.sync.enabled': next })
      if (next) {
        const state = store.getState()
        await writeSyncStorage(api.sync, state.profiles[state.activeProfileId])
      } else {
        const values = await api.sync.get(null)
        const keys = Object.keys(values).filter(key => key === 'mnt.sync.manifest' || key.startsWith('mnt.sync.chunk.'))
        if (keys.length) await api.sync.remove(keys)
      }
      setEnabled(next)
      setInitialized(true)
      setStatus(message(next ? 'saved' : 'disabled'))
    } catch (error) {
      setStatus(String(error).toLowerCase().includes('quota') ? message('quota') : message('error'))
    } finally { setBusy(false) }
  }

  const keepLocal = async () => {
    if (!api || !store) return
    setBusy(true)
    try {
      const state = store.getState()
      await writeSyncStorage(api.sync, state.profiles[state.activeProfileId])
      setConflict(null)
      setStatus(message('saved'))
    } catch (error) { setStatus(String(error).toLowerCase().includes('quota') ? message('quota') : message('error')) }
    finally { setBusy(false) }
  }

  const pullCloud = async () => {
    if (!store || !conflict) return
    setBusy(true)
    resolving.current = true
    try {
      const state = store.getState()
      const local = state.profiles[state.activeProfileId]
      const merged = mergeSyncedProfile(local, conflict)
      await state.updateProfile(local.meta.id, () => merged)
      setConflict(null)
      setCanUndo(true)
      setStatus(message('pulled'))
    } catch { setStatus(message('error')) }
    finally { resolving.current = false; setBusy(false) }
  }

  const undoPull = async () => {
    if (!store || !api) return
    setBusy(true)
    resolving.current = true
    try {
      const state = store.getState()
      await state.undo(state.activeProfileId)
      setCanUndo(false)
      const restored = store.getState()
      await writeSyncStorage(api.sync, restored.profiles[restored.activeProfileId])
      setStatus(message('undone'))
    } catch { setStatus(message('error')) }
    finally { resolving.current = false; setBusy(false) }
  }

  return <section aria-labelledby="sync-heading" aria-busy={busy}>
    <h3 id="sync-heading">{message('title')}</h3>
    <p>{message('hint')}</p>
    <Toggle label={message('enable')} checked={enabled} disabled={!ready || busy || !api || !store} onChange={value => void setSyncEnabled(value)} />
    {!api && <p role="note">{message('extensionOnly')}</p>}
    {conflict && <div className="sd-widget-actions" role="group" aria-label={message('conflict')}>
      <p role="status">{message('conflict')}</p>
      <button type="button" className="sd-button" disabled={busy} onClick={() => void keepLocal()}>{message('keepLocal')}</button>
      <button type="button" className="sd-button" disabled={busy} onClick={() => void pullCloud()}>{message('pullCloud')}</button>
    </div>}
    {canUndo && <button type="button" className="sd-button" disabled={busy} onClick={() => void undoPull()}>{message('undo')}</button>}
    {status && <p role="status">{status}</p>}
  </section>
}
