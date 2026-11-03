import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: ['**/web.spec.ts', '**/docs.spec.ts', '**/m19.spec.ts', '**/infinity-starters.spec.ts'],
  fullyParallel: false,
  reporter: 'list',
  webServer: {
    command: 'npm run build:web && node scripts/preview-web.mjs',
    env: { PROMPTAB_SW_UPDATE_TEST: '1' },
    url: 'http://127.0.0.1:4174/promptab/app/',
    reuseExistingServer: false,
  },
  use: { baseURL: 'http://127.0.0.1:4174/promptab/app/', timezoneId: 'UTC', locale: 'en-US' },
  projects: [{ name: 'web', use: { ...devices['Desktop Chrome'] } }],
})
