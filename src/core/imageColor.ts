/** Estimated average colour of an image, from a tiny downscaled copy. Null where canvas decoding is unavailable. */
export async function sampleAverageColor(blob: Blob): Promise<string | null> {
  try {
    const size = 16
    const bitmap = await createImageBitmap(blob, { resizeWidth: size, resizeHeight: size, resizeQuality: 'low' })
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return null
    context.drawImage(bitmap, 0, 0, size, size)
    bitmap.close()
    const { data } = context.getImageData(0, 0, size, size)
    const sum = [0, 0, 0]
    for (let i = 0; i < data.length; i += 4) for (let c = 0; c < 3; c++) sum[c] += data[i + c]
    const pixels = data.length / 4
    return '#' + sum.map(value => Math.round(value / pixels).toString(16).padStart(2, '0')).join('')
  } catch {
    return null
  }
}
