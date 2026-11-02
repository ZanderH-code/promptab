import { describe, expect, it } from 'vitest'
import { areaGridProblem, areaNames, breakpointFor, columnCount, resolveGrid, widgetsIn } from './grid'
import { templateGrid } from './templates'
import { BREAKPOINTS } from '../schema/defaults'
import { profileV2Schema } from '../schema/profile'
import { applyTemplate, detectTemplate } from './profile'
import { migrateV1 } from '../migrate/v1'
import { defaults } from '../model'

describe('layout grids', () => {
  it('lists unique named areas in order and counts columns', () => {
    expect(areaNames(['clock clock .', 'links links .'])).toEqual(['clock', 'links'])
    expect(columnCount(['clock links .'])).toBe(3)
  })

  it('rejects ragged rows and non-rectangular named areas', () => {
    expect(areaGridProblem(['a b', 'a'])).toContain('same number')
    expect(areaGridProblem(['a b', 'b a'])).toContain('one rectangle')
    expect(areaGridProblem(['a a', 'b b'])).toBeNull()
  })

  it('uses narrow overrides, then medium, and base at wide widths', () => {
    const layout = { areas: ['base'], breakpoints: { medium: { areas: ['mid'] }, narrow: { areas: ['small'] } } } as any
    expect(resolveGrid(layout, 'narrow').areas).toEqual(['small'])
    expect(resolveGrid(layout, 'medium').areas).toEqual(['mid'])
    expect(resolveGrid(layout, 'wide').areas).toEqual(['base'])
    expect(resolveGrid({ areas: ['base'], breakpoints: { medium: { areas: ['mid'] } } } as any, 'narrow').areas).toEqual(['mid'])
  })

  it('classifies breakpoint boundaries from shared defaults', () => {
    expect([breakpointFor(BREAKPOINTS.narrowMax), breakpointFor(BREAKPOINTS.narrowMax + 1), breakpointFor(BREAKPOINTS.mediumMax), breakpointFor(BREAKPOINTS.mediumMax + 1)]).toEqual(['narrow', 'medium', 'medium', 'wide'])
  })

  it('orders visible widgets and exposes six named templates', () => {
    const widgets = [{ id: 'b', area: 'a', order: 2 }, { id: 'a', area: 'a', order: 1 }, { id: 'x', area: 'b', order: 0 }, { id: 'h', area: 'a', order: 0, hidden: true }] as any
    expect(widgetsIn(widgets, 'a').map(item => item.id)).toEqual(['a', 'b'])
    expect(templateGrid('dashboard').areas).toEqual(['clock clock clock', 'date search links'])
    for (const id of ['stacked', 'split', 'top-grid', 'websites', 'zen', 'dashboard', 'icon-split', 'banner'] as const) expect(templateGrid(id).areas.length).toBeGreaterThan(0)
  })

  it('configures the two target templates with their required widgets and area styles', async () => {
    const profile = await migrateV1({ ...defaults, shortcuts: [] }, { id: () => 'targets', now: () => '2026-01-01T00:00:00.000Z', add: () => Promise.reject(new Error('unused')) })
    const a = applyTemplate(profile, 'icon-split')
    expect(a.theme.mode).toBe('light')
    expect(a.layout.areas).toEqual(['bookmarks divider overview'])
    expect(a.layout.columns?.[1]).toBe('1px')
    expect(a.widgets.find(item => item.type === 'bookmarks')?.props).toMatchObject({ style: 'icon-only', maxColumns: 3, showGroupTitles: false, showAdd: false, iconColor: 'accent' })
    expect(a.widgets.find(item => item.type === 'toolbar')).toMatchObject({ area: 'overview', props: { actions: ['add', 'edit', 'settings'] } })
    const b = applyTemplate(profile, 'banner')
    expect(b.layout.areas).toEqual(['.', 'banner', 'websites'])
    expect(b.layout.areaStyles?.banner).toMatchObject({ opacity: 68, blur: 18, bleed: true, border: { bottom: 2 } })
    expect(b.theme.color.accent).toBe('#2fd6e0')
    expect(b.widgets.find(item => item.type === 'bookmarks')).toMatchObject({ hidden: true, props: { showAdd: false } })
    expect(templateGrid('banner').breakpoints?.narrow?.areas).toEqual(['banner', 'websites'])
    expect(b.theme.font.display).toBe('barlow-condensed')
    expect(profileV2Schema.safeParse(a).success).toBe(true)
    expect(profileV2Schema.safeParse(b).success).toBe(true)
  })

  it('keeps the date with the clock when switching to dashboard', async () => {
    const profile = await migrateV1(defaults, { id: () => 'dashboard', now: () => '2026-01-01T00:00:00.000Z', add: () => Promise.reject(new Error('unused')) })
    const dashboard = applyTemplate(profile, 'dashboard')
    expect(dashboard.widgets.find(item => item.type === 'clock')).toMatchObject({ area: 'clock', order: 0 })
    expect(dashboard.widgets.find(item => item.type === 'date')).toMatchObject({ area: 'clock', order: 1 })
    expect(dashboard.widgets.find(item => item.type === 'bookmarks')?.area).toBe('links')
    expect(dashboard.widgets.find(item => item.type === 'search')?.area).toBe('search')
  })

  it('applies every template to a styled profile with a valid resulting grid', async () => {
    const profile = await migrateV1(defaults, { id: () => 'test', now: () => '2026-01-01T00:00:00.000Z', add: () => Promise.reject(new Error('unused')) })
    profile.layout.areaStyles = { overview: { padding: 10 } }
    for (const template of ['stacked', 'split', 'top-grid', 'websites', 'zen', 'dashboard', 'icon-split', 'banner'] as const) {
      const result = applyTemplate(profile, template)
      expect(profileV2Schema.safeParse(result).success, template).toBe(true)
      expect(detectTemplate(result)).toBe(template)
    }
  })

  it('validates grid rectangles, column counts and area styles', () => {
    const base = { schemaVersion: 2, meta: { id: 'x', name: 'x', createdAt: '2026-01-01', updatedAt: '2026-01-01' }, prefs: { language: 'en', openIn: 'same-tab', reduceMotion: 'system', reduceTransparency: 'system' }, theme: { mode: 'dark', color: { bg: '#102932', surface: '#203942', text: '#ffffff', accent: '#90d5cd' }, font: { display: 'system', ui: 'system' }, radius: 1, shadow: 1, glass: 1, density: 'comfortable', scale: 1, iconShape: 'circle', iconSize: 72 }, background: { type: 'theme', dim: 35 }, layout: { contentWidth: 960, align: 'center-center', gap: 24, areas: ['a b'], columns: ['1fr', '1fr'], areaStyles: { a: { blur: 3, opacity: 50 } } }, widgets: [], bookmarks: { groups: [] }, search: { engines: [{ id: 'g', name: 'G', template: 'https://google.com?q={query}' }], defaultEngineId: 'g' }, custom: { css: '', cssEnabled: false, variables: [], values: {} } }
    expect(profileV2Schema.safeParse(base).success).toBe(true)
    expect(profileV2Schema.safeParse({ ...base, layout: { ...base.layout, columns: ['1fr'] } }).success).toBe(false)
    expect(profileV2Schema.safeParse({ ...base, layout: { ...base.layout, areas: ['a b', 'b a'] } }).success).toBe(false)
  })
})
