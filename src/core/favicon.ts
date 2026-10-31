export function normalizeUrl(input: string): string | null {
  const text = input.trim()
  if (!text || /\s/.test(text) || (/^[a-z][a-z\d+.-]*:/i.test(text) && !/^https?:\/\//i.test(text) && !/^localhost:\d/i.test(text))) return null
  try { const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`); return ['http:', 'https:'].includes(url.protocol) && url.hostname ? url.href : null } catch { return null }
}
export function faviconUrl(input: string): string | null { const url = normalizeUrl(input); return url ? `${new URL(url).origin}/favicon.ico` : null }
export function browserFaviconUrl(input: string): string | null {
  const url = normalizeUrl(input)
  if (!url || !window.chrome?.runtime?.getURL) return null
  const icon = new URL(window.chrome.runtime.getURL('/_favicon/'))
  icon.searchParams.set('pageUrl', url)
  icon.searchParams.set('size', '64')
  return icon.href
}
