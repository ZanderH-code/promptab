import { lazy, Suspense } from 'react'
const AiWorkbench = lazy(() => import('../AiWorkbench').then(m => ({ default: m.AiWorkbench })))
import type { Ctx, Item } from './shared'

export function aiItems(ctx: Ctx): Item[] {
  return [
    { id: 'ai', keys: ['ai.title', 'ai.intro', 'ai.copyPrompt', 'ai.reply', 'ai.copyErrors', 'ai.preview', 'ai.apply'], words: ['ai', 'prompt', 'chatgpt', 'claude', 'kimi', 'deepseek', '主题包'], node: <Suspense fallback={null}><AiWorkbench ctx={ctx} /></Suspense> },
  ]
}
