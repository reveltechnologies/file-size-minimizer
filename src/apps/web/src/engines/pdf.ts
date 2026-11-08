import {
  outputFileName,
  outputMimeType,
  PDF_IMAGE_STEPS,
  type PdfImageStep,
} from '@revel/core'
import {
  PDFArray,
  PDFBool,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFRawStream,
  PDFRef,
  PDFStream,
  type PDFObject,
} from 'pdf-lib'
import { createImageRenderer } from './canvas'
import type { CompressJob, CompressResult } from './types'

/** Smaller images (logos, signatures) aren't worth the quality risk. */
const MIN_IMAGE_BYTES = 30_000

const name = (value: string) => PDFName.of(value)

interface PdfImage {
  ref: PDFRef
  original: PDFRawStream
}

export async function compressPdf(job: CompressJob): Promise<CompressResult> {
  const { files: [file], maxBytes, options, onStep, onProgress, onStatus, signal } = job
  const fileName = outputFileName(file.name, 'pdf')
  const toResult = (bytes: Uint8Array): CompressResult => ({
    blob: new Blob([bytes.slice()], { type: outputMimeType('pdf') }),
    fileName,
  })

  onStatus('Opening your PDF…')
  const original = new Uint8Array(await file.arrayBuffer())
  if (original.length <= maxBytes && !options.stripHiddenData) return toResult(original)

  let doc: PDFDocument
  try {
    // updateMetadata: false stops pdf-lib stamping its own Producer and dates.
    doc = await PDFDocument.load(original, { updateMetadata: false })
  } catch {
    throw new Error("Couldn't open this PDF. It may be damaged or password-protected.")
  }

  onStep('shrink')
  onStatus('Tidying up your PDF…')
  if (options.stripHiddenData) stripMetadata(doc)
  // Drops earlier revisions ("edit history") and anything else no page uses.
  removeUnreachableObjects(doc)
  let bytes = await doc.save({ useObjectStreams: true })

  const images = bytes.length > maxBytes ? findRecompressibleImages(doc) : []
  const totalSteps = images.length > 0 ? PDF_IMAGE_STEPS.length : 0
  for (const [i, step] of PDF_IMAGE_STEPS.entries()) {
    if (bytes.length <= maxBytes || images.length === 0) break
    signal.throwIfAborted()
    onStatus(i === 0 ? 'Shrinking the pages…' : 'Fine-tuning the size…')
    onProgress(i / totalSteps)
    await recompressImages(doc, images, step, signal)
    bytes = await doc.save({ useObjectStreams: true })
  }
  onProgress(1)

  // Only keep our version if it is smaller or had data to remove.
  if (!options.stripHiddenData && bytes.length >= original.length) return toResult(original)
  return toResult(bytes)
}

function stripMetadata(doc: PDFDocument): void {
  // Author, title, creator app, producer, dates.
  const info = doc.context.lookup(doc.context.trailerInfo.Info)
  if (info instanceof PDFDict) for (const key of info.keys()) info.delete(key)

  // XMP packets and app-private data (e.g. Illustrator/Acrobat edit state).
  for (const node of [doc.catalog, ...doc.getPages().map((page) => page.node)]) {
    node.delete(name('Metadata'))
    node.delete(name('PieceInfo'))
  }
}

function removeUnreachableObjects(doc: PDFDocument): void {
  const { context } = doc
  const reachable = new Set<PDFRef>()
  const pending: PDFObject[] = [context.trailerInfo.Root, context.trailerInfo.Info].filter(
    (obj): obj is PDFObject => obj !== undefined,
  )

  while (pending.length > 0) {
    const obj = pending.pop()
    if (obj instanceof PDFRef) {
      if (reachable.has(obj)) continue
      reachable.add(obj)
      const target = context.lookup(obj)
      if (target) pending.push(target)
    } else if (obj instanceof PDFDict) {
      pending.push(...obj.values())
    } else if (obj instanceof PDFArray) {
      pending.push(...obj.asArray())
    } else if (obj instanceof PDFStream) {
      pending.push(obj.dict)
    }
  }

  for (const [ref] of context.enumerateIndirectObjects()) {
    if (!reachable.has(ref)) context.delete(ref)
  }
}

/**
 * JPEG photos/scans in RGB or grayscale: the bulk of most portal PDFs.
 * Skips CMYK, masks, inverted (/Decode) and non-JPEG images, which the
 * browser can't round-trip faithfully.
 */
function findRecompressibleImages(doc: PDFDocument): PdfImage[] {
  const images: PdfImage[] = []
  for (const [ref, obj] of doc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream) || obj.contents.length < MIN_IMAGE_BYTES) continue
    const dict = obj.dict
    if (dict.get(name('Subtype')) !== name('Image')) continue
    if (!hasOnlyFilter(dict, 'DCTDecode')) continue
    if (dict.has(name('Decode')) || dict.get(name('ImageMask')) === PDFBool.True) continue
    if (!isRgbOrGray(doc, dict)) continue
    images.push({ ref, original: obj })
  }
  return images
}

function hasOnlyFilter(dict: PDFDict, filter: string): boolean {
  const value = dict.lookup(name('Filter'))
  if (value instanceof PDFArray) return value.size() === 1 && value.lookup(0) === name(filter)
  return value === name(filter)
}

function isRgbOrGray(doc: PDFDocument, dict: PDFDict): boolean {
  const colorSpace = dict.lookup(name('ColorSpace'))
  if (colorSpace === name('DeviceRGB') || colorSpace === name('DeviceGray')) return true
  // [/ICCBased <stream with /N 1 or 3>]
  if (colorSpace instanceof PDFArray && colorSpace.lookup(0) === name('ICCBased')) {
    const profile = doc.context.lookup(colorSpace.get(1))
    const components = profile instanceof PDFStream ? profile.dict.lookup(name('N')) : undefined
    return components instanceof PDFNumber && [1, 3].includes(components.asNumber())
  }
  return false
}

/** Re-encodes each image from its original bytes, so passes never compound quality loss. */
async function recompressImages(
  doc: PDFDocument,
  images: PdfImage[],
  step: PdfImageStep,
  signal: AbortSignal,
): Promise<void> {
  for (const image of images) {
    signal.throwIfAborted()
    const source = new Blob([image.original.contents.slice()], { type: 'image/jpeg' })
    // PDF viewers ignore EXIF rotation inside embedded JPEGs, so we must too.
    const bitmap = await createImageBitmap(source, { imageOrientation: 'none' }).catch(() => null)
    if (!bitmap) continue
    try {
      const scale = Math.min(1, step.maxLongSide / Math.max(bitmap.width, bitmap.height))
      const jpeg = new Uint8Array(await (await createImageRenderer(bitmap)(scale, step.quality)).arrayBuffer())
      if (jpeg.length >= image.original.contents.length) {
        doc.context.assign(image.ref, image.original)
        continue
      }

      const dict = image.original.dict.clone(doc.context)
      dict.set(name('Width'), PDFNumber.of(Math.max(1, Math.round(bitmap.width * scale))))
      dict.set(name('Height'), PDFNumber.of(Math.max(1, Math.round(bitmap.height * scale))))
      dict.set(name('BitsPerComponent'), PDFNumber.of(8))
      dict.set(name('ColorSpace'), name('DeviceRGB'))
      dict.set(name('Filter'), name('DCTDecode'))
      dict.delete(name('DecodeParms'))
      doc.context.assign(image.ref, PDFRawStream.of(dict, jpeg))
    } finally {
      bitmap.close()
    }
  }
}
