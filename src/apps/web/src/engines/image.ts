import {
  extractExif,
  fitImageToSize,
  fitLosslessImageToSize,
  formatBytes,
  imageScaleRange,
  insertExif,
  isJpeg,
  isPng,
  outputFileName,
  outputMimeType,
  stripJpegMetadata,
  stripPngMetadata,
} from '@revel/core'
import { createImageRenderer, decodeImage } from './canvas'
import type { CompressJob, CompressResult } from './types'

export async function compressImage(job: CompressJob): Promise<CompressResult> {
  return job.imageFormat === 'png' ? compressToPng(job) : compressToJpeg(job)
}

async function compressToJpeg(job: CompressJob): Promise<CompressResult> {
  const { files: [file], maxBytes, options, onStep, onProgress, onStatus, signal } = job
  const fileName = outputFileName(file.name, 'image')
  const toResult = (bytes: Uint8Array<ArrayBuffer>): CompressResult => ({
    blob: new Blob([bytes], { type: outputMimeType('image') }),
    fileName,
  })

  onStatus('Opening your photo…')
  const original = new Uint8Array(await file.arrayBuffer())

  // A JPEG that already fits keeps every pixel; only its metadata is touched.
  if (isJpeg(original) && original.length <= maxBytes) {
    const result = options.stripHiddenData ? stripJpegMetadata(original) : original
    if (result) return toResult(result)
  }

  // EXIF only survives re-encoding for JPEG sources; reserve room for it.
  const exif = !options.stripHiddenData && isJpeg(original) ? extractExif(original) : null
  const budget = maxBytes - (exif?.length ?? 0)

  const bitmap = await decodeImage(file, onStatus)
  try {
    signal.throwIfAborted()
    onStep('shrink')
    onStatus('Finding the best quality that fits…')
    const render = createImageRenderer(bitmap)
    let attempts = 0
    const fitted = await fitImageToSize(
      async ({ scale, quality }) => {
        signal.throwIfAborted()
        const blob = await render(scale, quality)
        onProgress(Math.min(0.95, ++attempts / 10))
        return { output: blob, bytes: blob.size }
      },
      budget,
      imageScaleRange(bitmap.width, bitmap.height),
    )
    if (!fitted) {
      throw new Error(`Couldn't get this photo under ${formatBytes(maxBytes)} without making it too small to use.`)
    }

    onProgress(1)
    if (!exif) return { blob: fitted.output, fileName }
    return toResult(insertExif(new Uint8Array(await fitted.output.arrayBuffer()), exif))
  } finally {
    bitmap.close()
  }
}

/** Keeps transparency. PNG has no quality setting, so only the dimensions can shrink. */
async function compressToPng(job: CompressJob): Promise<CompressResult> {
  const { files: [file], maxBytes, options, onStep, onProgress, onStatus, signal } = job
  const fileName = outputFileName(file.name, 'image', 'png')

  onStatus('Opening your image…')
  const original = new Uint8Array(await file.arrayBuffer())

  // A PNG that already fits keeps every pixel; only its metadata is touched.
  if (isPng(original) && original.length <= maxBytes) {
    const result = options.stripHiddenData ? stripPngMetadata(original) : original
    if (result) return { blob: new Blob([result], { type: outputMimeType('image', 'png') }), fileName }
  }

  const bitmap = await decodeImage(file, onStatus)
  try {
    signal.throwIfAborted()
    onStep('shrink')
    onStatus('Finding the biggest size that fits…')
    const render = createImageRenderer(bitmap, 'png')
    let attempts = 0
    const fitted = await fitLosslessImageToSize(
      async (scale) => {
        signal.throwIfAborted()
        const blob = await render(scale)
        onProgress(Math.min(0.95, ++attempts / 4))
        return { output: blob, bytes: blob.size }
      },
      maxBytes,
      imageScaleRange(bitmap.width, bitmap.height),
    )
    if (!fitted) {
      throw new Error(
        `Couldn't get this image under ${formatBytes(maxBytes)} as a PNG without making it too small to use. Try saving it as JPG.`,
      )
    }

    onProgress(1)
    return { blob: fitted.output, fileName }
  } finally {
    bitmap.close()
  }
}
