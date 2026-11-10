export const WALLPAPER_PREVIEW_KEY = 'mnt:wallpaper-preview:v1'
const MAX_BYTES = 64 * 1024
const MAX_EDGE = 1280

type WallpaperPreview = { version: 1; asset: string; dataUrl: string }

/** Stores a small JPEG preview; oversized or invalid payloads remove the previous entry. */
export function saveWallpaperPreview(asset: string, dataUrl: string): void {
  try {
    if (!dataUrl.startsWith('data:image/') || dataUrl.length > MAX_BYTES) { localStorage.removeItem(WALLPAPER_PREVIEW_KEY); return }
    localStorage.setItem(WALLPAPER_PREVIEW_KEY, JSON.stringify({ version: 1, asset, dataUrl }))
  } catch { /* The preview is optional. */ }
}

/** Returns the data URL only for the requested asset; a stale entry is removed. */
export function readWallpaperPreview(asset: string): string | null {
  try {
    const raw = localStorage.getItem(WALLPAPER_PREVIEW_KEY)
    if (!raw) return null
    const value = JSON.parse(raw) as Partial<WallpaperPreview> | null
    if (!value || value.version !== 1 || typeof value.asset !== 'string' || typeof value.dataUrl !== 'string') return null
    if (value.asset !== asset) { localStorage.removeItem(WALLPAPER_PREVIEW_KEY); return null }
    return value.dataUrl
  } catch { return null }
}

/** Rewrites the current image as a downscaled JPEG for the next open; failures are ignored. */
export async function writeWallpaperPreview(asset: string, blob: Blob): Promise<void> {
  try {
    const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' })
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) { bitmap.close(); return }
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    let dataUrl = ''
    for (const quality of [0.6, 0.4, 0.25]) {
      dataUrl = canvas.toDataURL('image/jpeg', quality)
      if (dataUrl.length <= MAX_BYTES) break
    }
    saveWallpaperPreview(asset, dataUrl)
  } catch { /* The preview is optional. */ }
}
