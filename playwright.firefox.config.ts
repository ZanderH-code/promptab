import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: 'firefox-smoke.spec.ts',
  fullyParallel: false,
  webServer: {
    command: 'npx vite preview --outDir dist-firefox --host 127.0.0.1 --port 4174 --strictPort',
    url: 'http://127.0.0.1:4174',
    reuseExistingServer: !process.env.CI,
  },
  use: { browserName: 'firefox', baseURL: 'http://127.0.0.1:4174', timezoneId: 'UTC', locale: 'en-US' },
})
