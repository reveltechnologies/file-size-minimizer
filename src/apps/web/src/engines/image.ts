import {
  extractExif,
  fitImageToSize,
  fitLosslessImageToSize,
  formatBytes,
  imageScaleRange,
  insertExif,
  isJpeg,
  isJpegFile,
  isPng,
  MAX_IMAGE_LONG_SIDE,
  MAX_JPEG_QUALITY,
  MIN_IMAGE_LONG_SIDE,
  outputFileName,
  outputMimeType,
  stripJpegMetadata,
  stripPngMetadata,
  type CompressOptions,
  type ImageFormat,
} from '@revel/core'
import { createImageRenderer, decodeImage } from './canvas'
import type { CompressJob, CompressResult } from './types'

export type Shrinkability = 'ok' | 'with-settings' | 'never'

export interface ImageEstimate {
  estimatedBytes: number
  minPossibleBytes: number
  width: number
  height: number
  outputWidth: number
  outputHeight: number
  canShrink: boolean
  fitsTarget: boolean
  shrinkability: Shrinkability
}

function getScaleAndQualityBounds(width: number, height: number, options: CompressOptions) {
  const longSide = Math.max(width, height)
  const keepDimensions = Boolean(options.imageKeepDimensions)
  const scaleFromPercent =
    !keepDimensions && options.imageScalePercent && options.imageScalePercent > 0
      ? Math.min(1, options.imageScalePercent / 100)
      : 1
  const maxDim =
    !keepDimensions && options.imageMaxDimension && options.imageMaxDimension > 0
      ? Math.min(MAX_IMAGE_LONG_SIDE, options.imageMaxDimension)
      : MAX_IMAGE_LONG_SIDE
  const base = imageScaleRange(width, height, maxDim, MIN_IMAGE_LONG_SIDE)
  const initialScale = keepDimensions ? 1 : Math.min(base.initialScale, scaleFromPercent)
  const minScale = keepDimensions ? 1 : Math.min(initialScale, base.minScale)
  const hasCustomScale =
    keepDimensions ||
    (options.imageScalePercent != null && options.imageScalePercent < 100) ||
    (options.imageMaxDimension != null && options.imageMaxDimension < longSide)
  const hasCustomQuality = options.imageQuality != null
  const maxQuality = hasCustomQuality ? options.imageQuality! : MAX_JPEG_QUALITY
  const minQuality = hasCustomQuality ? Math.min(0.25, options.imageQuality!) : 0.25
  return {
    initialScale,
    minScale,
    minQuality,
    maxQuality,
    hasCustomScale,
    hasCustomQuality,
    keepDimensions,
  }
}

function isSameSourceFormat(file: File, format: ImageFormat): boolean {
  if (format === 'jpeg') return isJpegFile(file.name, file.type)
  if (format === 'png') {
    const ext = file.name.split('.').pop()?.toLowerCase()
    return ext === 'png' || file.type === 'image/png'
  }
  const ext = file.name.split('.').pop()?.toLowerCase()
  return ext === 'webp' || file.type === 'image/webp'
}

export async function estimateImageShrink(
  file: File,
  maxBytes: number,
  options: CompressOptions,
  imageFormat: ImageFormat,
  signal: AbortSignal,
): Promise<ImageEstimate> {
  const original = new Uint8Array(await file.arrayBuffer())
  signal.throwIfAborted()
  const bitmap = await decodeImage(file, () => {})
  try {
    signal.throwIfAborted()
    const { width, height } = bitmap
    const bounds = getScaleAndQualityBounds(width, height, options)
    const forceReencode =
      bounds.hasCustomScale ||
      bounds.hasCustomQuality ||
      Boolean(options.imageGrayscale) ||
      !isSameSourceFormat(file, imageFormat)

    if (!forceReencode && original.length <= maxBytes) {
      if (imageFormat === 'jpeg' && isJpeg(original)) {
        const stripped = options.stripHiddenData
          ? (stripJpegMetadata(original) ?? original)
          : original
        if (stripped.length >= original.length) {
          return {
            estimatedBytes: original.length,
            minPossibleBytes: original.length,
            width,
            height,
            outputWidth: width,
            outputHeight: height,
            canShrink: false,
            fitsTarget: true,
            shrinkability: 'with-settings',
          }
        }
      }
      if (imageFormat === 'png' && isPng(original)) {
        const stripped = options.stripHiddenData
          ? (stripPngMetadata(original) ?? original)
          : original
        if (stripped.length >= original.length) {
          return {
            estimatedBytes: original.length,
            minPossibleBytes: original.length,
            width,
            height,
            outputWidth: width,
            outputHeight: height,
            canShrink: false,
            fitsTarget: true,
            shrinkability: 'with-settings',
          }
        }
      }
    }

    const render = createImageRenderer(bitmap, imageFormat, Boolean(options.imageGrayscale))

    if (imageFormat === 'png') {
      const fitted = await fitLosslessImageToSize(
        async (scale) => {
          signal.throwIfAborted()
          const blob = await render(scale)
          return { output: blob, bytes: blob.size }
        },
        Math.min(maxBytes, file.size),
        { initialScale: bounds.initialScale, minScale: bounds.minScale },
      )
      const fallbackBlob = fitted ? null : await render(bounds.minScale)
      const estimatedBytes = fitted ? fitted.bytes : fallbackBlob!.size
      const usedScale = fitted ? fitted.scale : bounds.minScale
      const canShrink = estimatedBytes < file.size
      return {
        estimatedBytes,
        minPossibleBytes: fallbackBlob ? fallbackBlob.size : estimatedBytes,
        width,
        height,
        outputWidth: Math.max(1, Math.round(width * usedScale)),
        outputHeight: Math.max(1, Math.round(height * usedScale)),
        canShrink,
        fitsTarget: estimatedBytes <= maxBytes,
        shrinkability: canShrink ? 'ok' : 'with-settings',
      }
    }

    const first = await render(bounds.initialScale, bounds.maxQuality)
    signal.throwIfAborted()
    let estimatedBytes = first.size
    let usedScale = bounds.initialScale
    let minPossibleBytes = first.size

    if (first.size > maxBytes || first.size >= file.size) {
      const budget = Math.min(maxBytes, file.size - 1)
      const fitted = await fitImageToSize(
        async ({ scale, quality }) => {
          signal.throwIfAborted()
          const blob = await render(scale, quality)
          return { output: blob, bytes: blob.size }
        },
        Math.max(1024, budget),
        {
          initialScale: bounds.initialScale,
          minScale: bounds.minScale,
          minQuality: bounds.minQuality,
          maxQuality: bounds.maxQuality,
        },
      )
      if (fitted) {
        estimatedBytes = fitted.bytes
        usedScale = fitted.scale
      } else {
        const floor = await render(bounds.minScale, bounds.minQuality)
        estimatedBytes = floor.size
        minPossibleBytes = floor.size
        usedScale = bounds.minScale
      }
    }

    const canShrink = estimatedBytes < file.size
    const canLowerMore =
      bounds.keepDimensions ||
      bounds.initialScale > bounds.minScale ||
      (options.imageQuality != null && options.imageQuality > 0.35)

    return {
      estimatedBytes,
      minPossibleBytes,
      width,
      height,
      outputWidth: Math.max(1, Math.round(width * usedScale)),
      outputHeight: Math.max(1, Math.round(height * usedScale)),
      canShrink,
      fitsTarget: estimatedBytes <= maxBytes,
      shrinkability: canShrink ? 'ok' : canLowerMore ? 'with-settings' : 'never',
    }
  } finally {
    bitmap.close()
  }
}

export async function compressImage(job: CompressJob): Promise<CompressResult> {
  const format = job.imageFormat ?? 'jpeg'
  if (format === 'png') return compressToPng(job)
  return compressToLossy(job, format)
}

async function compressToLossy(
  job: CompressJob,
  format: 'jpeg' | 'webp',
): Promise<CompressResult> {
  const { files: [file], maxBytes, options, onStep, onProgress, onStatus, signal } = job
  const fileName = outputFileName(file.name, 'image', format)
  const mime = outputMimeType('image', format)
  const toResult = (bytes: Uint8Array<ArrayBuffer>): CompressResult => ({
    blob: new Blob([bytes], { type: mime }),
    fileName,
  })

  onStatus('Reading image…')
  const original = new Uint8Array(await file.arrayBuffer())
  const bitmap = await decodeImage(file, onStatus)

  try {
    signal.throwIfAborted()
    const bounds = getScaleAndQualityBounds(bitmap.width, bitmap.height, options)
    const forceReencode =
      bounds.hasCustomScale ||
      bounds.hasCustomQuality ||
      Boolean(options.imageGrayscale) ||
      !isSameSourceFormat(file, format)

    if (!forceReencode && isJpeg(original) && original.length <= maxBytes) {
      const stripped = options.stripHiddenData ? stripJpegMetadata(original) : original
      if (stripped) return toResult(stripped)
    }

    const exif =
      format === 'jpeg' && !options.stripHiddenData && isJpeg(original)
        ? extractExif(original)
        : null
    const effectiveMaxBytes = Math.min(maxBytes, file.size)
    const budget = Math.max(1024, effectiveMaxBytes - (exif?.length ?? 0))

    onStep('shrink')
    onStatus('Compressing…')
    const render = createImageRenderer(bitmap, format, Boolean(options.imageGrayscale))
    let attempts = 0
    const fitted = await fitImageToSize(
      async ({ scale, quality }) => {
        signal.throwIfAborted()
        const blob = await render(scale, quality)
        onProgress(Math.min(0.95, ++attempts / 10))
        return { output: blob, bytes: blob.size }
      },
      budget,
      {
        initialScale: bounds.initialScale,
        minScale: bounds.minScale,
        minQuality: bounds.minQuality,
        maxQuality: bounds.maxQuality,
      },
    )

    if (!fitted) {
      if (!forceReencode && original.length <= maxBytes && isSameSourceFormat(file, format)) {
        const fallback =
          format === 'jpeg' && isJpeg(original) && options.stripHiddenData
            ? (stripJpegMetadata(original) ?? original)
            : original
        return toResult(fallback)
      }
      throw new Error(`Couldn't fit photo under ${formatBytes(maxBytes)}.`)
    }

    onProgress(1)
    if (!exif) {
      if (
        !forceReencode &&
        fitted.output.size >= original.length &&
        original.length <= maxBytes &&
        isJpeg(original)
      ) {
        return toResult(options.stripHiddenData ? (stripJpegMetadata(original) ?? original) : original)
      }
      return { blob: fitted.output, fileName }
    }

    const inserted = insertExif(new Uint8Array(await fitted.output.arrayBuffer()), exif)
    if (
      !forceReencode &&
      inserted.length >= original.length &&
      original.length <= maxBytes &&
      isJpeg(original)
    ) {
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
  const mime = outputMimeType('image', 'png')

  onStatus('Reading image…')
  const original = new Uint8Array(await file.arrayBuffer())
  const bitmap = await decodeImage(file, onStatus)

  try {
    signal.throwIfAborted()
    const bounds = getScaleAndQualityBounds(bitmap.width, bitmap.height, options)
    const forceReencode =
      bounds.hasCustomScale || Boolean(options.imageGrayscale) || !isSameSourceFormat(file, 'png')

    if (!forceReencode && isPng(original) && original.length <= maxBytes) {
      const result = options.stripHiddenData ? stripPngMetadata(original) : original
      if (result) return { blob: new Blob([result], { type: mime }), fileName }
    }

    onStep('shrink')
    onStatus('Compressing…')
    const render = createImageRenderer(bitmap, 'png', Boolean(options.imageGrayscale))
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
      { initialScale: bounds.initialScale, minScale: bounds.minScale },
    )
    if (!fitted) {
      if (!forceReencode && original.length <= maxBytes && isPng(original)) {
        return {
          blob: new Blob(
            [options.stripHiddenData ? (stripPngMetadata(original) ?? original) : original],
            { type: mime },
          ),
          fileName,
        }
      }
      throw new Error(`Couldn't fit PNG under ${formatBytes(maxBytes)}. Try JPG or WebP.`)
    }

    onProgress(1)
    if (
      !forceReencode &&
      fitted.output.size >= original.length &&
      original.length <= maxBytes &&
      isPng(original)
    ) {
      return {
        blob: new Blob(
          [options.stripHiddenData ? (stripPngMetadata(original) ?? original) : original],
          { type: mime },
        ),
        fileName,
      }
    }
    return { blob: fitted.output, fileName }
  } finally {
    bitmap.close()
  }
}
