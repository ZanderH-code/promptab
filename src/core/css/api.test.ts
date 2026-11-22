import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { createElement } from 'react'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { translate } from '../../i18n'
import { ShortcutGrid, type ShortcutGridProps } from '../../widgets/ShortcutGrid'
import { CSS_API_CLASSES, CSS_API_VARIABLES, CSS_API_VERSION } from './api'

const src = join(process.cwd(), 'src')
function files(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name)
    return statSync(path).isDirectory()
      ? files(path)
      : /\.(tsx?|css)$/.test(name) &&
          !/\.test\./.test(name) &&
          !path.endsWith('api.ts') &&
          !path.endsWith('docs.ts') &&
          !path.endsWith('prompt.ts')
        ? [path]
        : []
  })
}
// Public contract check: CSS_API_CLASSES and CSS_API_VARIABLES are the documented selectors/tokens
// that custom CSS and AI-written themes depend on.
const source = files(src)
  .map(path => readFileSync(path, 'utf8'))
  .join('\n')

const BOOKMARK_CLASSES = CSS_API_CLASSES.filter(name => name.startsWith('mnt-bookmark-'))
const OTHER_CLASSES = CSS_API_CLASSES.filter(name => !name.startsWith('mnt-bookmark-'))
const sampleItem = { id: 'one', name: 'Example', url: 'https://example.com', color: '#90d5cd', icon: 'E' }

afterEach(cleanup)

describe('CSS API', () => {
  it('is version 1', () => expect(CSS_API_VERSION).toBe(1))

  it.each(BOOKMARK_CLASSES)('bookmark style class %s is rendered in the DOM', name => {
    const style = name.slice('mnt-bookmark-'.length) as ShortcutGridProps['style']
    const props: ShortcutGridProps = {
      groups: [{ id: 'default', name: 'Quick links', collapsed: false, items: [sampleItem] }],
      shortcuts: [sampleItem],
      editing: false,
      t: (key, params) => translate('en', key, params),
      language: 'en',
      style,
      source: 'all',
      showGroupTitles: true,
      maxColumns: 6,
      showAdd: false,
      iconColor: 'per-site',
      openInNewTab: false,
      liftOnHover: false,
      onGroups: vi.fn(),
      onEdit: vi.fn(),
      onRemove: vi.fn(),
      onMove: vi.fn(),
      onAdd: vi.fn(),
      onContextMenu: vi.fn(),
      onGroupContextMenu: vi.fn(),
      onboarding: false,
      onOnboardingAction: vi.fn(),
    }
    const { container } = render(createElement(ShortcutGrid, props))
    expect(container.querySelector(`.${name}`)).not.toBeNull()
  })

  it.each(OTHER_CLASSES)('class %s is rendered by the app', name => {
    expect(new RegExp(`['"\` ]${name}(?=['"\` $])`).test(source)).toBe(true)
  })

  it.each(CSS_API_VARIABLES)('variable %s is defined by the app', name => {
    expect(source).toContain(name)
  })
})
