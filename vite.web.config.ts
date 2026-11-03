import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import * as icons from 'simple-icons'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'promptab-web-brand-catalog',
      generateBundle() {
        const catalog = Object.values(icons).map(({ title, slug, path, hex }) => ({ title, slug, path, hex }))
        this.emitFile({ type: 'asset', fileName: 'brand-catalog.json', source: `${JSON.stringify(catalog)}\n` })
      },
    },
    VitePWA({
      base: '/promptab/app/',
      registerType: 'prompt',
      injectRegister: null,
      includeAssets: [
        'icons/apple-touch-icon-180.png', 'icons/pwa-192.png', 'icons/pwa-512.png', 'icons/pwa-maskable-512.png',
        'icons/pwa-192.svg', 'icons/pwa-512.svg', 'icons/pwa-maskable.svg',
      ],
      manifest: {
        name: 'Promptab',
        short_name: 'Promptab',
        description: 'A customizable new tab with AI-assisted themes, shortcuts, widgets, optional weather, and browser sync.',
        start_url: '/promptab/app/',
        scope: '/promptab/app/',
        display: 'standalone',
        background_color: '#0c222b',
        theme_color: '#0c222b',
        icons: [
          { src: 'icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/pwa-192.svg', sizes: 'any', type: 'image/svg+xml' },
          { src: 'icons/pwa-512.svg', sizes: 'any', type: 'image/svg+xml' },
          { src: 'icons/pwa-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/promptab/app/index.html',
        globPatterns: ['**/*.{html,js,css,ico,png,svg,webmanifest,woff2,json}'],
        globIgnores: ['manifest.json', 'brand-catalog.json'],
        cleanupOutdatedCaches: true,
      },
    }),
    {
      name: 'promptab-web-pwa-entry',
      transformIndexHtml: {
        order: 'pre',
        handler(html) {
          return html
            .replace('<head>', '<head><meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\'; object-src \'none\'; font-src \'self\' data: blob:; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data: blob: https:; connect-src \'self\' https://api.anthropic.com https://api.openai.com https://api.open-meteo.com https://geocoding-api.open-meteo.com https://zanderh-code.github.io; media-src \'self\' blob:"/><link rel="apple-touch-icon" href="/promptab/app/icons/apple-touch-icon-180.png"/><meta name="apple-mobile-web-app-capable" content="yes"/><meta name="apple-mobile-web-app-title" content="Promptab"/><meta name="apple-mobile-web-app-status-bar-style" content="default"/>')
            .replace('</body>', '<script type="module" src="/src/pwa-register.ts"></script></body>')
        },
      },
    },
  ],
  base: '/promptab/app/',
  define: { __WEB_BUILD__: 'true' },
  build: {
    outDir: 'dist-web',
    emptyOutDir: true,
    rollupOptions: {
      input: { index: resolve(import.meta.dirname, 'index.html') },
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/') || id.includes('/node_modules/scheduler/')) return 'react-vendor'
        },
      },
    },
  },
})
