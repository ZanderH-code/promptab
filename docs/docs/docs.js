const LANGUAGE_KEY = 'promptab_lang'
const LANGUAGES = ['en', 'zh-CN']

function applyLanguage(language, save = false) {
  const current = LANGUAGES.includes(language) ? language : 'en'
  document.documentElement.lang = current
  for (const section of document.querySelectorAll('[data-language]')) {
    section.hidden = section.dataset.language !== current
  }
  const toggle = document.querySelector('#language')
  if (toggle) toggle.textContent = current === 'en' ? '中文' : 'English'
  const title = document.documentElement.dataset[`title${current === 'en' ? 'En' : 'ZhCn'}`]
  if (title) document.title = title
  if (save) localStorage.setItem(LANGUAGE_KEY, current)
}

applyLanguage(localStorage.getItem(LANGUAGE_KEY))
document.querySelector('#language')?.addEventListener('click', () => {
  applyLanguage(document.documentElement.lang === 'en' ? 'zh-CN' : 'en', true)
})

for (const code of document.querySelectorAll('[data-example-src]')) {
  fetch(code.dataset.exampleSrc)
    .then(response => response.ok ? response.text() : Promise.reject(new Error(`HTTP ${response.status}`)))
    .then(source => { code.textContent = source.trim() })
    .catch(() => { code.textContent = 'Example unavailable; open the linked source file.' })
}
