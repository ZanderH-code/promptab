/** Firefox may still be reading the blob when click() returns, so the URL is revoked a little later. */
export const REVOKE_DELAY_MS = 1000

/** Saves a blob as a file through a temporary link. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS)
}

/** Saves JSON text, or a value pretty-printed as JSON, as a file. */
export function downloadJson(value: unknown, filename: string) {
  downloadBlob(new Blob([typeof value === 'string' ? value : JSON.stringify(value, null, 2)], { type: 'application/json' }), filename)
}
