/// <reference types="vite-plugin-pwa/client" />
import { registerSW } from 'virtual:pwa-register'
import { translate } from './i18n'
import './pwa-prompt.css'

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'pwa-update-prompt'
    const updateLabel = () => {
      const language = document.documentElement.lang.startsWith('zh') ? 'zh-CN' : 'en'
      button.textContent = translate(language, 'pwa.update')
    }
    updateLabel()
    const languageObserver = new MutationObserver(updateLabel)
    languageObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] })
    button.addEventListener('click', () => updateSW(true), { once: true })
    document.body.append(button)
  },
})
