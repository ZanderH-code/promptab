import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const pages = [
  { path: '', title: 'Documentation' },
  { path: 'getting-started.html', title: 'Getting started' },
  { path: 'design-with-ai.html', title: 'Design with your AI' },
  { path: 'theme-pack.html', title: 'Theme pack reference' },
  { path: 'css-api.html', title: 'CSS API reference' },
  { path: 'faq.html', title: 'FAQ' },
]

for (const doc of pages) {
  test(`public docs page loads, links resolve, and passes axe: ${doc.path || 'index'}`, async ({ page, request }) => {
    const pageErrors: string[] = []
    const failedResponses: string[] = []
    page.on('pageerror', error => pageErrors.push(error.message))
    page.on('response', response => { if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`) })

    await page.goto(`/promptab/docs/${doc.path}`)
    await expect(page.locator('h1').first()).toBeVisible()
    await expect(page).toHaveTitle(new RegExp(doc.title, 'i'))
    await expect(page.locator('#language')).toBeVisible()

    const links = await page.locator('a[href]').evaluateAll(anchors => anchors.map(anchor => (anchor as HTMLAnchorElement).href))
    const origin = new URL(page.url()).origin
    const localUrls = [...new Set(links.map(href => new URL(href)).filter(url => url.origin === origin && url.hash === '').map(url => `${url.pathname}${url.search}`))]
    for (const url of localUrls) {
      const response = await request.get(url)
      expect(response.ok(), `${url} returned ${response.status()}`).toBeTruthy()
    }

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
    const moderateOrWorse = results.violations.filter(violation => ['moderate', 'serious', 'critical'].includes(violation.impact ?? ''))
    expect(moderateOrWorse, JSON.stringify(moderateOrWorse, null, 2)).toEqual([])
    expect(pageErrors).toEqual([])
    expect(failedResponses).toEqual([])
  })
}

test('docs language switch updates content and title and persists', async ({ page }) => {
  await page.goto('/promptab/docs/')
  const languageButton = page.locator('#language')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await languageButton.click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN')
  await expect(page).toHaveTitle('文档 | Promptab')
  await expect(page.getByRole('heading', { name: '打造属于你的新标签页' })).toBeVisible()
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN')
  await expect(page.getByRole('heading', { name: '打造属于你的新标签页' })).toBeVisible()
})
