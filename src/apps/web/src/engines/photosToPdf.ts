import {
  outputFileName,
  outputMimeType,
  PDF_IMAGE_STEPS,
  placeOnA4,
  type PdfImageStep,
} from '@revel/core'
import { PDFDocument } from 'pdf-lib'
import { createImageRenderer, decodeImage } from './canvas'
import type { CompressJob, CompressResult } from './types'

export async function photosToPdf(job: CompressJob): Promise<CompressResult> {
  const { files, maxBytes, options, onStep, onProgress, onStatus, signal } = job
  const pages: ImageBitmap[] = []
  const maxDim =
    options.pdfMaxDimension === 0
      ? Number.POSITIVE_INFINITY
      : (options.pdfMaxDimension ?? PDF_IMAGE_STEPS[0].maxLongSide)

  try {
    for (const [i, file] of files.entries()) {
      signal.throwIfAborted()
      onStatus(`${i + 1} / ${files.length}`)
      onProgress(i / files.length)
      const decoded = await decodeImage(file, onStatus)
      pages.push(Number.isFinite(maxDim) ? await downscale(decoded, maxDim) : decoded)
    }

    onStep('shrink')
    const steps = PDF_IMAGE_STEPS.map((step) => ({
      maxLongSide:
        options.pdfMaxDimension === 0
          ? Number.POSITIVE_INFINITY
          : Math.min(step.maxLongSide, maxDim),
      quality: options.pdfImageQuality != null ? Math.min(step.quality, options.pdfImageQuality) : step.quality,
    }))

    let bytes: Uint8Array = new Uint8Array()
    for (const [i, step] of steps.entries()) {
      onStatus('Building PDF…')
      onProgress(i / steps.length)
      bytes = await buildPdf(pages, step, signal)
      if (bytes.length <= maxBytes) break
    }
    onProgress(1)

    return {
      blob: new Blob([bytes.slice()], { type: outputMimeType('pdf') }),
      fileName: outputFileName('combined.pdf', 'pdf'),
    }
  } finally {
    for (const page of pages) page.close()
  }
}

async function downscale(bitmap: ImageBitmap, maxLongSide: number): Promise<ImageBitmap> {
  const scale = maxLongSide / Math.max(bitmap.width, bitmap.height)
  if (scale >= 1) return bitmap
  try {
    return await createImageBitmap(bitmap, {
      resizeWidth: Math.round(bitmap.width * scale),
      resizeHeight: Math.round(bitmap.height * scale),
      resizeQuality: 'high',
    })
  } finally {
    bitmap.close()
  }
}

async function buildPdf(pages: ImageBitmap[], step: PdfImageStep, signal: AbortSignal): Promise<Uint8Array> {
  const doc = await PDFDocument.create({ updateMetadata: false })
  for (const bitmap of pages) {
    signal.throwIfAborted()
    const scale = Number.isFinite(step.maxLongSide)
      ? Math.min(1, step.maxLongSide / Math.max(bitmap.width, bitmap.height))
      : 1
    const jpeg = await (await createImageRenderer(bitmap)(scale, step.quality)).arrayBuffer()
    const image = await doc.embedJpg(jpeg)
    const { pageWidth, pageHeight, ...placement } = placeOnA4(bitmap.width, bitmap.height)
    doc.addPage([pageWidth, pageHeight]).drawImage(image, placement)
  }
  return doc.save({ useObjectStreams: true })
}
