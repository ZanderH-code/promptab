import { defaults, validate, type Settings } from '../core/model'
import { extensionApi } from '../platform/extension'

export type RawSettings =
  | { backend: 'chrome'; present: boolean; value?: unknown }
  | { backend: 'local'; value: string | null }

export async function readRawSettings(): Promise<RawSettings> {
  const local = extensionApi()?.storage?.local
  if (local) {
    const result = await local.get('settings')
    return { backend: 'chrome', present: Object.hasOwn(result, 'settings'), value: result.settings }
  }
  return { backend: 'local', value: localStorage.getItem('settings') }
}

export async function restoreRawSettings(raw: RawSettings): Promise<void> {
  if (raw.backend === 'chrome') {
    const local = extensionApi()?.storage?.local
    if (!local) throw new Error('Extension storage is unavailable')
    if (raw.present) await local.set({ settings: raw.value })
    else if (local.remove) await local.remove('settings')
    else throw new Error('Extension storage cannot remove settings')
  } else if (raw.value === null) localStorage.removeItem('settings')
  else localStorage.setItem('settings', raw.value)
}

export async function loadSettings(): Promise<Settings> {
  const local = extensionApi()?.storage?.local
  const saved = local ? (await local.get('settings')).settings : JSON.parse(localStorage.getItem('settings') || 'null')
  return saved ? validate(saved) : structuredClone(defaults)
}

export async function saveSettings(settings: Settings) {
  const local = extensionApi()?.storage?.local
  if (local) await local.set({ settings })
  else localStorage.setItem('settings', JSON.stringify(settings))
}
