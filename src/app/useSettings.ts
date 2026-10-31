import { useCallback, useEffect, useState } from 'react'
import { defaults, type Settings } from '../core/model'
import type { MessageRef } from '../i18n'
import { loadSettings, saveSettings } from '../storage/settings'

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [error, setError] = useState<MessageRef | null>(null)

  useEffect(() => {
    loadSettings().then(setSettings).catch(() => setError({ key: 'error.loadSettings' }))
  }, [])

  const update = useCallback((next: Settings) => {
    setSettings(next)
    saveSettings(next).then(() => setError(null)).catch(() => setError({ key: 'error.saveSettings' }))
  }, [])

  const patch = useCallback((changes: Partial<Settings>) => {
    if (settings) update({ ...settings, ...changes })
  }, [settings, update])

  const reset = useCallback(() => update(structuredClone(defaults)), [update])

  return { settings, error, setError, update, patch, reset }
}
