import { AiWorkbench } from '../AiWorkbench'
import type { Ctx, Item } from './shared'

export function aiItems(ctx: Ctx): Item[] {
  return [
    { id: 'ai', keys: ['ai.title', 'ai.intro', 'ai.copyPrompt', 'ai.reply', 'ai.copyErrors', 'ai.preview', 'ai.apply'], words: ['ai', 'prompt', 'chatgpt', 'claude', 'kimi', 'deepseek', '主题包'], node: <AiWorkbench ctx={ctx} /> },
  ]
}
