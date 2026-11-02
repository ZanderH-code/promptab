import { describe, expect, it } from 'vitest'
import { MAX_WALLPAPER_VIDEO_BYTES, validateVideo } from './video'

describe('wallpaper video validation', () => {
  it('accepts MP4 and WebM within the wallpaper limit', () => {
    for (const type of ['video/mp4', 'video/webm']) expect(() => validateVideo(new Blob(['clip'], { type }))).not.toThrow()
  })

  it('rejects unsupported media and clips over 30 MB', () => {
    expect(() => validateVideo(new Blob(['image'], { type: 'image/png' }))).toThrow()
    expect(() => validateVideo(new Blob([new Uint8Array(MAX_WALLPAPER_VIDEO_BYTES + 1)], { type: 'video/mp4' }))).toThrow()
  })
})
