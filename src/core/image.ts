import { MessageError } from '../i18n'

export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']

export function validateImage(file: Blob, maxBytes: number) {
  if (!IMAGE_TYPES.includes(file.type) || file.size > maxBytes) {
    throw new MessageError('error.imageType', { size: maxBytes / 1024 / 1024 })
  }
}
