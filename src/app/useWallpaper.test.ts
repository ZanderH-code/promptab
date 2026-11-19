import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defaults } from '../core/model'
import { migrateV1 } from '../core/migrate/v1'
import type { ProfileV2 } from '../core/schema/profile'

const image = new Blob(['image'], { type: 'image/png' })
vi.mock('./useSettings', () => ({ assets: { get: vi.fn(async () => image) } }))
vi.mock('./wallpaperPreview', () => ({ readWallpaperPreview: vi.fn(), writeWallpaperPreview: vi.fn(async () => {}) }))

const { readWallpaperPreview, writeWallpaperPreview } = await import('./wallpaperPreview')
const { useWallpaper } = await import('./useWallpaper')
const reference = `mnt-asset:${'a'.repeat(64)}`

async function profile(): Promise<ProfileV2> {
  const value = await migrateV1(defaults, { id: () => 'main', now: () => '2026-01-01T00:00:00.000Z', add: vi.fn() })
  value.background = { type: 'image', dim: 0, image: { asset: reference, position: 'center', scale: 1, blur: 0, grayscale: 0, vignette: 0 } }
  return value
}

describe('wallpaper preview', () => {
  beforeEach(() => { vi.mocked(writeWallpaperPreview).mockClear(); URL.createObjectURL = vi.fn(() => 'blob:wallpaper'); URL.revokeObjectURL = vi.fn() })

  it('writes a preview when none is stored for the image', async () => {
    vi.mocked(readWallpaperPreview).mockReturnValue(null)
    const value = await profile()
    const rendered = renderHook(() => useWallpaper(value, vi.fn(), vi.fn()))
    await waitFor(() => expect(writeWallpaperPreview).toHaveBeenCalledWith(reference, image))
    rendered.unmount()
  })

  it('keeps a preview already stored for the same image', async () => {
    vi.mocked(readWallpaperPreview).mockReturnValue('data:image/jpeg;base64,AAAA')
    const value = await profile()
    const rendered = renderHook(() => useWallpaper(value, vi.fn(), vi.fn()))
    await waitFor(() => expect(rendered.result.current.url).toBe('blob:wallpaper'))
    expect(writeWallpaperPreview).not.toHaveBeenCalled()
    rendered.unmount()
  })
})
