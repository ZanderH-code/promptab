import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/web.spec.ts',
  fullyParallel: false,
  reporter: 'list',
  webServer: {
    command: 'npm run build:web && node scripts/preview-web.mjs',
    url: 'http://127.0.0.1:4174/promptab/app/',
    reuseExistingServer: !process.env.CI,
  },
  use: { baseURL: 'http://127.0.0.1:4174/promptab/app/', timezoneId: 'UTC', locale: 'en-US' },
  projects: [{ name: 'web', use: { ...devices['Desktop Chrome'] } }],
})
