import { useEffect, useId, useRef, useState } from 'react'
import { useStore } from 'zustand'
import type { StoreApi } from 'zustand/vanilla'
import type { Language, Translate } from '../../i18n'
import type { ProfileStore } from '../../store/profile'

export type ProfileSectionProps = { store: StoreApi<ProfileStore>; t: Translate; language: Language }

export function ProfileSection({ store, t, language }: ProfileSectionProps) {
  const { profiles, activeProfileId, history, initialized } = useStore(store)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const ownedPreview = useRef<ProfileStore['preview']>(null)
  useEffect(() => () => {
    if (ownedPreview.current && store.getState().preview === ownedPreview.current) store.getState().clearPreview()
  }, [store])
  const headingId = useId()
  const selectId = useId()
  const active = profiles[activeProfileId]
  const snapshots = history.profiles[activeProfileId]?.snapshots ?? []

  function clearPreview() {
    if (ownedPreview.current && store.getState().preview === ownedPreview.current) store.getState().clearPreview()
    ownedPreview.current = null
    setPreviewId(null)
  }

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(false)
    try { await action() } catch { setError(true) } finally { setBusy(false) }
  }

  function create() {
    const name = window.prompt(t('profile.newPrompt'))?.trim()
    if (!name || !active) return
    const now = new Date().toISOString()
    const copy = structuredClone(active)
    copy.meta = { id: crypto.randomUUID(), name, createdAt: now, updatedAt: now }
    void run(() => store.getState().createProfile(copy))
  }

  function rename() {
    const name = window.prompt(t('profile.renamePrompt'), active?.meta.name)?.trim()
    if (name && name !== active?.meta.name) void run(() => store.getState().renameProfile(activeProfileId, name))
  }

  return (
    <section aria-labelledby={headingId} aria-busy={busy}>
      <h3 id={headingId}>{t('profile.heading')}</h3>
      <label htmlFor={selectId}>{t('profile.active')}</label>
      <select id={selectId} value={activeProfileId} disabled={busy || !initialized} onChange={event => {
        const id = event.target.value
        clearPreview()
        void run(() => store.getState().switchProfile(id))
      }}>
        {Object.values(profiles).map(profile => <option key={profile.meta.id} value={profile.meta.id}>{profile.meta.name}</option>)}
      </select>
      <div className="backup-actions">
        <button type="button" className="reset" disabled={busy || !initialized || !active} onClick={create}>{t('profile.new')}</button>
        <button type="button" className="reset" disabled={busy || !initialized || !active} onClick={rename}>{t('profile.rename')}</button>
        <button type="button" className="reset" disabled={busy || !initialized || Object.keys(profiles).length <= 1} onClick={() => {
          if (active && window.confirm(t('profile.confirmDelete', { name: active.meta.name }))) {
            clearPreview()
            void run(() => store.getState().deleteProfile(activeProfileId))
          }
        }}>{t('profile.delete')}</button>
      </div>
      <h4>{t('profile.history')}</h4>
      {snapshots.length === 0 ? <p>{t('profile.emptyHistory')}</p> : <ul>
        {snapshots.map(snapshot => <li key={snapshot.id}>
          <time dateTime={new Date(snapshot.createdAt).toISOString()}>{new Date(snapshot.createdAt).toLocaleString(language)}</time>{' '}
          <span>{t(`profile.kind.${snapshot.kind}`)}</span>{' '}
          <button type="button" disabled={busy || !initialized} onClick={() => {
            if (previewId === snapshot.id) clearPreview()
            else { store.getState().setPreview(activeProfileId, snapshot.profile); ownedPreview.current = store.getState().preview; setPreviewId(snapshot.id) }
          }}>{t(previewId === snapshot.id ? 'profile.stopPreview' : 'profile.preview')}</button>{' '}
          <button type="button" disabled={busy || !initialized} onClick={() => {
            if (window.confirm(t('profile.confirmRestore'))) {
              clearPreview()
              void run(() => store.getState().restoreSnapshot(activeProfileId, snapshot.id))
            }
          }}>{t('profile.restore')}</button>{' '}
          <button type="button" disabled={busy || !initialized} aria-pressed={snapshot.pinned} onClick={() => void run(() => store.getState().pinSnapshot(activeProfileId, snapshot.id, !snapshot.pinned))}>{t(snapshot.pinned ? 'profile.unpin' : 'profile.pin')}</button>
        </li>)}
      </ul>}
      {error && <p role="alert">{t('profile.error')}</p>}
    </section>
  )
}
