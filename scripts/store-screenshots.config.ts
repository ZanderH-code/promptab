import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  testMatch: 'store-screenshots.mts',
  fullyParallel: false,
  workers: 1,
  webServer: {
    cwd: '..',
    command: 'npx vite --host 127.0.0.1 --port 4178 --strictPort',
    url: 'http://127.0.0.1:4178',
    reuseExistingServer: false,
  },
  use: { timezoneId: 'UTC', locale: 'en-US', baseURL: 'http://127.0.0.1:4178', viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
})
