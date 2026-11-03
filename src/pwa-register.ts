/// <reference types="vite-plugin-pwa/client" />
import { registerSW } from 'virtual:pwa-register'
import './pwa-prompt.css'

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'pwa-update-prompt'
    button.textContent = document.documentElement.lang.startsWith('zh') ? '新版本可用 · 刷新' : 'New version available · Refresh'
    button.addEventListener('click', () => updateSW(true), { once: true })
    document.body.append(button)
  },
})
