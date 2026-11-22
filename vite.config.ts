import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { defaultExclude } from 'vitest/config'
import { withGoogleDrive } from './src/platform/driveManifest'

/** Google Drive sync needs `identity` and the Drive host, so only a build with an OAuth client ID declares them. */
function googleDriveManifest(clientId: string): Plugin {
  return {
    name: 'promptab-google-drive-manifest',
    apply: 'build',
    writeBundle(options) {
      if (!clientId || !options.dir) return
      const file = resolve(options.dir, 'manifest.json')
      writeFileSync(file, `${JSON.stringify(withGoogleDrive(JSON.parse(readFileSync(file, 'utf8'))), null, 2)}\n`)
    },
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), googleDriveManifest(loadEnv(mode, process.cwd(), 'VITE_').VITE_GOOGLE_DRIVE_CLIENT_ID ?? '')],
  base: './',
  define: { __WEB_BUILD__: 'false' },
  build: {
    // Every supported browser has native modulepreload; skip the polyfill on the startup path.
    modulePreload: { polyfill: false },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/') || id.includes('/node_modules/scheduler/')) return 'react-vendor'
        },
      },
    },
  },
  test: { environment: 'jsdom', exclude: [...defaultExclude, 'e2e/**', 'node_modules/**', 'dist/**', '**/.local-review/**', '**/.claude/**'] },
}))
