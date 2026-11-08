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

/**
 * Combines photos into one A4 PDF that fits the target. Photos are redrawn
 * on a canvas, so their GPS and camera data never reach the PDF.
 */
export async function photosToPdf(job: CompressJob): Promise<CompressResult> {
  const { files, maxBytes, onStep, onProgress, onStatus, signal } = job
  const pages: ImageBitmap[] = []

  try {
    // Downscale right away: 30 full-size phone photos would not fit in memory.
    for (const [i, file] of files.entries()) {
      signal.throwIfAborted()
      onStatus(`Reading photo ${i + 1} of ${files.length}…`)
      onProgress(i / files.length)
      pages.push(await downscale(await decodeImage(file, onStatus), PDF_IMAGE_STEPS[0].maxLongSide))
    }

    onStep('shrink')
    let bytes: Uint8Array = new Uint8Array()
    for (const [i, step] of PDF_IMAGE_STEPS.entries()) {
      onStatus(i === 0 ? 'Building your PDF…' : 'Fine-tuning the size…')
      onProgress(i / PDF_IMAGE_STEPS.length)
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
  // updateMetadata: false leaves out pdf-lib's own Producer/Creator/date stamps.
  const doc = await PDFDocument.create({ updateMetadata: false })
  for (const bitmap of pages) {
    signal.throwIfAborted()
    const scale = Math.min(1, step.maxLongSide / Math.max(bitmap.width, bitmap.height))
    const jpeg = await (await createImageRenderer(bitmap)(scale, step.quality)).arrayBuffer()
    const image = await doc.embedJpg(jpeg)
    const { pageWidth, pageHeight, ...placement } = placeOnA4(bitmap.width, bitmap.height)
    doc.addPage([pageWidth, pageHeight]).drawImage(image, placement)
  }
  return doc.save({ useObjectStreams: true })
}
