import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: process.env.CI ? [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]] : 'list',
  webServer: {
    command: 'npm run build && npx vite preview --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
  use: { baseURL: 'http://127.0.0.1:4173', timezoneId: 'UTC', locale: 'en-US', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  snapshotPathTemplate: '{testDir}/baselines/{arg}{ext}',
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.002, stylePath: './e2e/screenshot.css', animations: 'disabled', caret: 'hide' } },
  projects: [
    {
      name: 'chromium',
      testIgnore: ['**/mobile.spec.ts', '**/web.spec.ts', '**/docs.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chromium',
      testMatch: '**/mobile.spec.ts',
      use: { ...devices['Pixel 7'], browserName: 'chromium' },
    },
  ],
})
