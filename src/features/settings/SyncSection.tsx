import { useId } from 'react'
import type { StoreApi } from 'zustand/vanilla'
import type { Settings } from '../../core/model'
import { syncText, type SyncProvider } from '../../core/syncMessages'
import type { ProfileStore } from '../../store/profile'
import { syncActions, useSyncStatus } from '../../app/syncRuntime'
import { useConfirm } from './ConfirmDialog'
import { Toggle } from './controls'

type Props = { settings: Settings; store?: StoreApi<ProfileStore> }

export function SyncSection({ settings, store }: Props) {
  const status = useSyncStatus()
  const { confirm, dialog } = useConfirm()
  const providerId = useId()
  const text = (key: Parameters<typeof syncText>[1]) => syncText(settings.language, key, status.provider)
  const choice = status.providers.length > 1
  const drive = status.provider === 'gdrive'
  return <section aria-labelledby="sync-heading" aria-busy={status.busy}>
    <h3 id="sync-heading">{text(choice ? 'titleAny' : 'title')}</h3>
    {choice && <>
      <label htmlFor={providerId}>{text('provider')}</label>
      <select id={providerId} value={status.provider} disabled={!status.ready || status.busy || status.enabled || !store} onChange={event => void syncActions.setProvider(event.target.value as SyncProvider)}>
        {status.providers.map(provider => <option key={provider} value={provider}>{text(provider === 'gdrive' ? 'providerDrive' : 'providerBrowser')}</option>)}
      </select>
    </>}
    <p>{text('hint')}</p>
    <Toggle label={text('enable')} checked={status.requested ?? status.enabled} disabled={!status.ready || status.busy || !status.available || !store} onChange={value => void syncActions.enable(value)} />
    {status.ready && !status.available && <p role="note">{text('extensionOnly')}</p>}
    {drive && status.enabled && status.needsSignIn && <p role="note">{text('reauth')} <button type="button" className="sd-button" disabled={status.busy} onClick={() => void syncActions.signIn()}>{text('signIn')}</button></p>}
    {/* Deleting the Drive copy needs a live Google sign-in, which only exists while Drive sync is on. */}
    {status.available && (!drive || status.enabled) && <button type="button" className="sd-button" disabled={status.busy} onClick={async () => { if (await confirm({ title: text('deleteConfirm'), confirmLabel: text('deleteCloud'), cancelLabel: text('cancel'), danger: true })) void syncActions.deleteCloud() }}>{text('deleteCloud')}</button>}
    {dialog}
  </section>
}
