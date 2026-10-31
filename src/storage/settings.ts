import { defaults, validate, type Settings } from '../core/model'

export type RawSettings =
  | { backend: 'chrome'; present: boolean; value?: unknown }
  | { backend: 'local'; value: string | null }

export async function readRawSettings(): Promise<RawSettings> {
  if (window.chrome?.storage) {
    const result = await window.chrome.storage.local.get('settings')
    return { backend: 'chrome', present: Object.hasOwn(result, 'settings'), value: result.settings }
  }
  return { backend: 'local', value: localStorage.getItem('settings') }
}

export async function restoreRawSettings(raw: RawSettings): Promise<void> {
  if (raw.backend === 'chrome') {
    const local = window.chrome?.storage?.local as (NonNullable<NonNullable<typeof window.chrome>['storage']>['local'] & { remove(key: string): Promise<void> }) | undefined
    if (!local) throw new Error('Chrome storage is unavailable')
    if (raw.present) await local.set({ settings: raw.value })
    else await local.remove('settings')
  } else if (raw.value === null) localStorage.removeItem('settings')
  else localStorage.setItem('settings', raw.value)
}

export async function loadSettings(): Promise<Settings> {
  const saved = window.chrome?.storage
    ? (await window.chrome.storage.local.get('settings')).settings
    : JSON.parse(localStorage.getItem('settings') || 'null')
  return saved ? validate(saved) : structuredClone(defaults)
}

export async function saveSettings(settings: Settings) {
  if (window.chrome?.storage) await window.chrome.storage.local.set({ settings })
  else localStorage.setItem('settings', JSON.stringify(settings))
}
