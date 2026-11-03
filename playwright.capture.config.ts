import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './scripts',
  testMatch: 'capture-gallery.pw.ts',
  timeout: 180_000,
  workers: 1,
  webServer: { command: 'npm run build && npx vite preview --host 127.0.0.1 --port 4399 --strictPort', url: 'http://127.0.0.1:4399', reuseExistingServer: false },
  use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:4399', locale: 'en-US', timezoneId: 'UTC', viewport: { width: 1280, height: 800 }, deviceScaleFactor: 0.5 },
})
