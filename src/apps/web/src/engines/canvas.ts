import { outputMimeType, type ImageFormat } from '@revel/core'

export type ImageRenderer = (scale: number, quality?: number) => Promise<Blob>

export async function decodeImage(file: File, onStatus: (message: string) => void): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file)
  } catch {
    onStatus('Decoding HEIC…')
    try {
      const { heicTo } = await import('heic-to')
      return await heicTo({ blob: file, type: 'bitmap' })
    } catch {
      throw new Error(`Couldn't open "${file.name}".`)
    }
  }
}

export function createImageRenderer(bitmap: ImageBitmap, format: ImageFormat = 'jpeg'): ImageRenderer {
  const canvas = document.createElement('canvas')
  let drawnScale = -1

  return (scale, quality) => {
    if (scale !== drawnScale) {
      canvas.width = Math.max(1, Math.round(bitmap.width * scale))
      canvas.height = Math.max(1, Math.round(bitmap.height * scale))
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Canvas unavailable.')
      if (format === 'jpeg') {
        context.fillStyle = '#fff'
        context.fillRect(0, 0, canvas.width, canvas.height)
      }
      context.imageSmoothingQuality = 'high'
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      drawnScale = scale
    }

    return new Promise((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode image.'))),
        outputMimeType('image', format),
        quality,
      ),
    )
  }
}
