import { pngMayHaveTransparency } from '@revel/core'

const SCAN_LONG_SIDE = 1024

export async function hasTransparency(file: File): Promise<boolean> {
  const header = new Uint8Array(await file.arrayBuffer())
  if (pngMayHaveTransparency(header) === false) return false

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return false
  }
  try {
    const scale = Math.min(1, SCAN_LONG_SIDE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return false
    context.imageSmoothingQuality = 'high'
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height)
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) return true
    }
    return false
  } finally {
    bitmap.close()
  }
}
