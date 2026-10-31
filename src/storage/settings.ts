import { defaults, validate, type Settings } from '../core/model'

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
