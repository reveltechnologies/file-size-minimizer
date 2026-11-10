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

  onStatus('Reading image…')
  const original = new Uint8Array(await file.arrayBuffer())

  if (isJpeg(original) && original.length <= maxBytes) {
    const result = options.stripHiddenData ? stripJpegMetadata(original) : original
    if (result) return toResult(result)
  }

  const exif = !options.stripHiddenData && isJpeg(original) ? extractExif(original) : null
  const effectiveMaxBytes = Math.min(maxBytes, file.size)
  const budget = effectiveMaxBytes - (exif?.length ?? 0)

  const bitmap = await decodeImage(file, onStatus)
  try {
    signal.throwIfAborted()
    onStep('shrink')
    onStatus('Compressing…')
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
      if (original.length <= maxBytes && isJpeg(original)) {
        return toResult(options.stripHiddenData ? (stripJpegMetadata(original) ?? original) : original)
      }
      throw new Error(`Couldn't fit photo under ${formatBytes(maxBytes)}.`)
    }

    onProgress(1)
    if (!exif) {
      if (fitted.output.size >= original.length && original.length <= maxBytes && isJpeg(original)) {
        return toResult(options.stripHiddenData ? (stripJpegMetadata(original) ?? original) : original)
      }
      return { blob: fitted.output, fileName }
    }
    const inserted = insertExif(new Uint8Array(await fitted.output.arrayBuffer()), exif)
    if (inserted.length >= original.length && original.length <= maxBytes && isJpeg(original)) {
      return toResult(options.stripHiddenData ? (stripJpegMetadata(original) ?? original) : original)
    }
    return toResult(inserted)
  } finally {
    bitmap.close()
  }
}

async function compressToPng(job: CompressJob): Promise<CompressResult> {
  const { files: [file], maxBytes, options, onStep, onProgress, onStatus, signal } = job
  const fileName = outputFileName(file.name, 'image', 'png')

  onStatus('Reading image…')
  const original = new Uint8Array(await file.arrayBuffer())

  if (isPng(original) && original.length <= maxBytes) {
    const result = options.stripHiddenData ? stripPngMetadata(original) : original
    if (result) return { blob: new Blob([result], { type: outputMimeType('image', 'png') }), fileName }
  }

  const bitmap = await decodeImage(file, onStatus)
  try {
    signal.throwIfAborted()
    onStep('shrink')
    onStatus('Compressing…')
    const render = createImageRenderer(bitmap, 'png')
    let attempts = 0
    const effectiveMaxBytes = Math.min(maxBytes, file.size)
    const fitted = await fitLosslessImageToSize(
      async (scale) => {
        signal.throwIfAborted()
        const blob = await render(scale)
        onProgress(Math.min(0.95, ++attempts / 4))
        return { output: blob, bytes: blob.size }
      },
      effectiveMaxBytes,
      imageScaleRange(bitmap.width, bitmap.height),
    )
    if (!fitted) {
      if (original.length <= maxBytes && isPng(original)) {
        return {
          blob: new Blob([options.stripHiddenData ? (stripPngMetadata(original) ?? original) : original], { type: outputMimeType('image', 'png') }),
          fileName,
        }
      }
      throw new Error(`Couldn't fit PNG under ${formatBytes(maxBytes)}. Try JPG.`)
    }

    onProgress(1)
    if (fitted.output.size >= original.length && original.length <= maxBytes && isPng(original)) {
      return {
        blob: new Blob([options.stripHiddenData ? (stripPngMetadata(original) ?? original) : original], { type: outputMimeType('image', 'png') }),
        fileName,
      }
    }
    return { blob: fitted.output, fileName }
  } finally {
    bitmap.close()
  }
}
