import type { StoreApi } from 'zustand/vanilla'
import type { Settings } from '../../core/model'
import { syncText } from '../../core/syncMessages'
import type { ProfileStore } from '../../store/profile'
import { syncActions, useSyncStatus } from '../../app/syncRuntime'
import { useConfirm } from './ConfirmDialog'
import { Toggle } from './controls'

type Props = { settings: Settings; store?: StoreApi<ProfileStore> }

export function SyncSection({ settings, store }: Props) {
  const status = useSyncStatus()
  const { confirm, dialog } = useConfirm()
  const text = (key: Parameters<typeof syncText>[1]) => syncText(settings.language, key)
  return <section aria-labelledby="sync-heading" aria-busy={status.busy}>
    <h3 id="sync-heading">{text('title')}</h3>
    <p>{text('hint')}</p>
    <Toggle label={text('enable')} checked={status.enabled} disabled={!status.ready || status.busy || !status.available || !store} onChange={value => void syncActions.enable(value)} />
    {status.ready && !status.available && <p role="note">{text('extensionOnly')}</p>}
    {status.available && <button type="button" className="sd-button" disabled={status.busy} onClick={async () => { if (await confirm({ title: text('deleteConfirm'), confirmLabel: text('deleteCloud'), cancelLabel: text('cancel'), danger: true })) void syncActions.deleteCloud() }}>{text('deleteCloud')}</button>}
    {dialog}
  </section>
}
