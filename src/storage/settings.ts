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
