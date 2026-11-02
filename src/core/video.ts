import { MessageError } from '../i18n'

export const VIDEO_TYPES = ['video/mp4', 'video/webm'] as const
export const MAX_WALLPAPER_VIDEO_BYTES = 30 * 1024 * 1024

export function validateVideo(file: Blob) {
  if (!VIDEO_TYPES.includes(file.type as typeof VIDEO_TYPES[number]) || file.size > MAX_WALLPAPER_VIDEO_BYTES) {
    throw new MessageError('error.videoType', { size: 30 })
  }
}
