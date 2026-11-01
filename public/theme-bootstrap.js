// Restore only application-owned tokens; persisted profile state remains authoritative.
try {
  const cache = JSON.parse(localStorage.getItem('mnt:theme-cache:v1') || 'null')
  if (cache && (cache.mode === 'light' || cache.mode === 'dark') && (!cache.system || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') === cache.mode) && cache.properties && typeof cache.properties === 'object') {
    const root = document.documentElement
    root.dataset.theme = cache.mode
    root.dataset.glass = cache.glass === 'on' ? 'on' : 'off'
    if (typeof cache.background === 'string' && cache.background.length < 500 && !/url\s*\(/i.test(cache.background) && (cache.background.startsWith('linear-gradient(') ? CSS.supports('background', cache.background) : CSS.supports('color', cache.background))) root.style.setProperty('--mnt-scheme-bg', cache.background)
    for (const [name, value] of Object.entries(cache.properties)) {
      if (/^--mnt-(scheme-bg|bg|bg-elevated|surface|surface-hover|surface-active|text|text-muted|text-faint|accent|accent-soft|accent-strong|accent-text|on-accent|danger|danger-soft|border|border-strong|overlay|shade-[1-9])$/.test(name) && typeof value === 'string' && value.length < 100 && CSS.supports('color', value) && !/url\s*\(/i.test(value)) root.style.setProperty(name, value)
    }
  }
} catch { /* Ignore stale or inaccessible cache. */ }
