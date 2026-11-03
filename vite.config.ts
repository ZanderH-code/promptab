import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { defaultExclude } from 'vitest/config'
export default defineConfig({
  plugins: [react()],
  base: './',
  define: { __WEB_BUILD__: 'false' },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/') || id.includes('/node_modules/scheduler/')) return 'react-vendor'
        },
      },
    },
  },
  test: { environment: 'jsdom', exclude: [...defaultExclude, 'e2e/**', 'node_modules/**', 'dist/**', '**/.local-review/**', '**/.claude/**'] },
})
