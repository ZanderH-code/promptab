import { appearanceItems } from './rows/appearance'
import { backgroundItems } from './rows/background'
import { layoutItems } from './rows/layout'
import { widgetsItems } from './rows/widgets'
import { shortcutsItems } from './rows/shortcuts'
import { searchItems } from './rows/search'
import { styleItems } from './rows/style'
import { aiItems } from './rows/ai'
import { dataItems } from './rows/data'
import { aboutItems } from './rows/about'
import type { Ctx, Item, TabId } from './rows/shared'

export { TABS } from './rows/shared'
export type { Ctx, Item, TabId } from './rows/shared'
export { appearanceItems } from './rows/appearance'
export { backgroundItems } from './rows/background'
export { layoutItems } from './rows/layout'
export { widgetsItems } from './rows/widgets'
export { shortcutsItems } from './rows/shortcuts'
export { searchItems } from './rows/search'
export { styleItems } from './rows/style'
export { aiItems } from './rows/ai'
export { dataItems } from './rows/data'
export { aboutItems } from './rows/about'
export { parsePosition } from './rows/background'

export function itemsFor(tab: TabId, ctx: Ctx): Item[] {
  switch (tab) {
    case 'appearance': return appearanceItems(ctx)
    case 'background': return backgroundItems(ctx)
    case 'layout': return layoutItems(ctx)
    case 'widgets': return widgetsItems(ctx)
    case 'shortcuts': return shortcutsItems(ctx)
    case 'search': return searchItems(ctx)
    case 'style': return styleItems(ctx)
    case 'ai': return aiItems(ctx)
    case 'data': return dataItems(ctx)
    case 'about': return aboutItems(ctx)
  }
}
