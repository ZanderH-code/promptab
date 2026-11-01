import { test, expect } from '@playwright/test'
import { seedExistingUser } from './helpers'

const styles = ['tile', 'list', 'minimal', 'card', 'icon-only'] as const

test('bookmark styles have mixed icon visual baselines', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.clock.install({ time: new Date('2026-10-31T10:24:00Z') })
  await seedExistingUser(page)
  await page.goto('/')
  await expect(page.locator('.clock')).toBeVisible()
  await page.evaluate(() => {
    const index = JSON.parse(localStorage.getItem('profiles:v2:index')!)
    const key = 'profiles:v2:generation:' + index.generation
    const snapshot = JSON.parse(localStorage.getItem(key)!)
    const profile = snapshot.profiles.profiles[snapshot.profiles.activeProfileId]
    const base = profile.bookmarks.groups[0].items[0] ?? { id: 'fixture-base', name: '', url: 'https://example.org', color: '#90d5cd', icon: 'E', iconMode: 'auto' }
    const makeLink = (link: Record<string, unknown>) => {
      const { builtinName: _builtinName, builtinIcon: _builtinIcon, builtinGroup: _builtinGroup, ...plainBase } = base
      return { ...plainBase, ...link }
    }
    profile.bookmarks.groups[0].items = [
      makeLink({ id: 'brand-mark', name: 'GitHub', url: 'https://github.com', icon: 'G', iconMode: 'brand', iconName: 'github', brand: { slug: 'github', title: 'GitHub', path: 'M12 .297a12 12 0 0 0-3.8 23.38c.6.11.82-.26.82-.58v-2.05c-3.34.73-4.04-1.42-4.04-1.42-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.74.08-.74 1.2.09 1.84 1.23 1.84 1.23 1.07 1.83 2.8 1.3 3.48.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.95 0-1.31.47-2.38 1.23-3.22-.12-.3-.54-1.52.12-3.17 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.29-1.23 3.29-1.23.66 1.65.25 2.87.13 3.17.77.84 1.23 1.91 1.23 3.22 0 4.62-2.8 5.64-5.48 5.94.43.37.81 1.1.81 2.22v3.3c0 .32.22.69.83.57A12 12 0 0 0 12 .297', hex: '181717' } }),
      makeLink({ id: 'lucide-mark', name: 'Docs', url: 'https://example.org/settings', icon: 'D', iconMode: 'lucide', iconName: 'settings' }),
      makeLink({ id: 'emoji-mark', name: 'Music', url: 'https://example.org/garden', icon: 'M', iconMode: 'emoji', iconName: '🌻' }),
      makeLink({ id: 'text-mark', name: 'Notes', url: 'https://example.org/notes', icon: 'N', iconMode: 'text' }),
    ]
    const widget = profile.widgets.find((item: { type: string }) => item.type === 'bookmarks')
    widget.props.source = 'all'
    localStorage.setItem(key, JSON.stringify(snapshot))
  })
  await page.reload()
  const bookmarks = page.locator('.bookmarks')
  for (const style of styles) {
    await page.evaluate(style => {
      const index = JSON.parse(localStorage.getItem('profiles:v2:index')!)
      const key = 'profiles:v2:generation:' + index.generation
      const snapshot = JSON.parse(localStorage.getItem(key)!)
      const profile = snapshot.profiles.profiles[snapshot.profiles.activeProfileId]
      profile.widgets.find((item: { type: string }) => item.type === 'bookmarks').props.style = style
      localStorage.setItem(key, JSON.stringify(snapshot))
    }, style)
    await page.reload()
    await expect(bookmarks).toHaveClass(new RegExp(`mnt-bookmark-${style}`))
    await expect(page).toHaveScreenshot(`m3b-${style}-1440x900.png`)
  }

  const link = page.getByRole('link', { name: 'GitHub' })
  await link.focus()
  await expect(link).toBeFocused()
  await link.hover()
  await expect.poll(() => link.evaluate(element => getComputedStyle(element, '::after').opacity)).toBe('1')
  await expect.poll(() => link.evaluate(element => getComputedStyle(element, '::after').content)).toContain('github.com')
  await expect(page).toHaveScreenshot('m3b-icon-only-hover-1440x900.png')
})
