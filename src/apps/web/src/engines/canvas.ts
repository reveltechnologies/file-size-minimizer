import { outputMimeType, type ImageFormat } from '@revel/core'

/** `quality` is 0…1 and only used for JPEG. */
export type ImageRenderer = (scale: number, quality?: number) => Promise<Blob>

/**
 * Uses the browser's own decoder first (Safari reads HEIC natively), then
 * falls back to heic-to, which is only downloaded when actually needed.
 * EXIF rotation is applied, so the result is upright.
 */
export async function decodeImage(file: File, onStatus: (message: string) => void): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file)
  } catch {
    onStatus('Opening your iPhone photo…')
    try {
      const { heicTo } = await import('heic-to')
      return await heicTo({ blob: file, type: 'bitmap' })
    } catch {
      throw new Error(`Couldn't open "${file.name}". It may be damaged or in an unsupported format.`)
    }
  }
}

/**
 * Draws a decoded image onto a canvas and encodes it as JPEG or PNG. Canvas
 * output carries no EXIF, GPS or ICC profile: that is the "unseen data" wipe
 * for photos.
 */
export function createImageRenderer(bitmap: ImageBitmap, format: ImageFormat = 'jpeg'): ImageRenderer {
  const canvas = document.createElement('canvas')
  let drawnScale = -1

  return (scale, quality) => {
    if (scale !== drawnScale) {
      canvas.width = Math.max(1, Math.round(bitmap.width * scale))
      canvas.height = Math.max(1, Math.round(bitmap.height * scale))
      const context = canvas.getContext('2d')
      if (!context) throw new Error('This browser blocked image processing (canvas unavailable).')
      if (format === 'jpeg') {
        // JPEG has no transparency: paint white so see-through areas don't turn black.
        context.fillStyle = '#fff'
        context.fillRect(0, 0, canvas.width, canvas.height)
      }
      context.imageSmoothingQuality = 'high'
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      drawnScale = scale
    }

    return new Promise((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the image.'))),
        outputMimeType('image', format),
        quality,
      ),
    )
  }
}
