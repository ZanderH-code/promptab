import { test, expect } from '@playwright/test'

const styles = ['tile', 'list', 'minimal', 'card', 'icon-only'] as const

test('bookmark styles render and icon-only stays accessible', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.clock')).toBeVisible()
  await page.evaluate(() => {
    const index = JSON.parse(localStorage.getItem('profiles:v2:index')!)
    const key = 'profiles:v2:generation:' + index.generation
    const snapshot = JSON.parse(localStorage.getItem(key)!)
    const profile = snapshot.profiles.profiles[snapshot.profiles.activeProfileId]
    const group = profile.bookmarks.groups[0]
    group.items = [{ ...group.items[0], id: 'style-test', name: 'Accessible bookmark', builtinName: undefined, builtinGroup: undefined, url: 'https://example.org/path' }]
    const widget = profile.widgets.find((item: { type: string }) => item.type === 'bookmarks')
    widget.props.source = 'all'
    localStorage.setItem(key, JSON.stringify(snapshot))
  })

  const bookmarks = page.locator('.bookmarks')
  for (const style of styles) {
    await page.evaluate(style => {
      const index = JSON.parse(localStorage.getItem('profiles:v2:index')!)
      const key = 'profiles:v2:generation:' + index.generation
      const snapshot = JSON.parse(localStorage.getItem(key)!)
      const profile = snapshot.profiles.profiles[snapshot.profiles.activeProfileId]
      const widget = profile.widgets.find((item: { type: string }) => item.type === 'bookmarks')
      widget.props.style = style
      localStorage.setItem(key, JSON.stringify(snapshot))
    }, style)
    await page.reload()
    await expect(bookmarks).toHaveClass(new RegExp(`mnt-bookmark-${style}`))
  }

  const link = page.getByRole('link', { name: 'Accessible bookmark' })
  await expect(link).toHaveAttribute('href', 'https://example.org/path')
  await link.focus()
  await expect(link).toBeFocused()
  await link.hover()
  await expect.poll(() => link.evaluate(element => getComputedStyle(element, '::after').opacity)).toBe('1')
  await expect.poll(() => link.evaluate(element => getComputedStyle(element, '::after').content)).toContain('example.org')
})
