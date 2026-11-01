import { lazy, Suspense } from 'react'
import type { Ctx, Item } from './shared'

const CssEditor = lazy(() => import('../CssEditor').then(module => ({ default: module.CssEditor })))

export function styleItems(ctx: Ctx): Item[] {
  return [
    { id: 'css', keys: ['css.title', 'css.hint', 'css.enable', 'css.editor'], words: ['css', 'style'], node: <Suspense fallback={null}><CssEditor ctx={ctx} safeMode={ctx.safe} /></Suspense> },
  ]
}
