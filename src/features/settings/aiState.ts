import { useSyncExternalStore } from 'react'
import type { PackPart } from '../../core/ai/pack'

export type AiState = {
  request: string
  includeCurrent: boolean
  reply: string
  /** Which code block of the reply is in use. */
  pick: number
  /** Parts the person switched off; everything the pack carries is applied by default. */
  skip: Record<PackPart, boolean>
}

const initial = (): AiState => ({ request: '', includeCurrent: false, reply: '', pick: 0, skip: { theme: false, background: false, css: false } })

let state = initial()
const listeners = new Set<() => void>()

/**
 * The workbench draft lives outside React so it survives tab switches and a closed drawer;
 * it is never persisted, because a pasted reply can be large and the person may not want it kept.
 */
export function useAiState(): [AiState, (patch: Partial<AiState>) => void] {
  const current = useSyncExternalStore(
    listener => { listeners.add(listener); return () => { listeners.delete(listener) } },
    () => state,
  )
  return [current, patch => { state = { ...state, ...patch }; listeners.forEach(listener => listener()) }]
}

export function resetAiState() {
  state = initial()
  listeners.forEach(listener => listener())
}
