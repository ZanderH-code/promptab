import { CssEditor } from '../CssEditor'
import type { Ctx, Item } from './shared'

export function styleItems(ctx: Ctx): Item[] {
  return [
    { id: 'css', keys: ['css.title', 'css.hint', 'css.enable', 'css.editor'], words: ['css', 'style'], node: <CssEditor ctx={ctx} safeMode={ctx.safe} /> },
  ]
}
