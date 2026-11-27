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

const MIN_IMAGE_BYTES = 30_000

const name = (value: string) => PDFName.of(value)

interface PdfImage {
  ref: PDFRef
  original: PDFRawStream
}

export interface PdfInspection {
  pageCount: number
  imageCount: number
  imageBytes: number
  nonImageBytes: number
  totalBytes: number
}

export async function inspectPdf(file: File): Promise<PdfInspection> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const doc = await PDFDocument.load(bytes, { updateMetadata: false, ignoreEncryption: true })
  const images = findRecompressibleImages(doc)
  const imageBytes = images.reduce((sum, img) => sum + img.original.contents.length, 0)
  return {
    pageCount: doc.getPageCount(),
    imageCount: images.length,
    imageBytes,
    nonImageBytes: Math.max(0, bytes.length - imageBytes),
    totalBytes: bytes.length,
  }
}

export async function compressPdf(job: CompressJob): Promise<CompressResult> {
  const { files: [file], maxBytes, options, onStep, onProgress, onStatus, signal } = job
  const fileName = outputFileName(file.name, 'pdf')
  const toResult = (bytes: Uint8Array): CompressResult => ({
    blob: new Blob([bytes.slice()], { type: outputMimeType('pdf') }),
    fileName,
  })

  const hasExplicitImageSettings =
    options.pdfMaxDimension != null || options.pdfImageQuality != null

  onStatus('Reading PDF…')
  const original = new Uint8Array(await file.arrayBuffer())
  if (original.length <= maxBytes && !options.stripHiddenData && !hasExplicitImageSettings) {
    return toResult(original)
  }

  let doc: PDFDocument
  try {
    doc = await PDFDocument.load(original, { updateMetadata: false })
  } catch {
    throw new Error("Couldn't open PDF.")
  }

  onStep('shrink')
  onStatus('Optimizing PDF…')
  if (options.stripHiddenData) stripMetadata(doc)
  removeUnreachableObjects(doc)
  let bytes = await doc.save({ useObjectStreams: true })

  const needsImagePass = bytes.length > maxBytes || hasExplicitImageSettings
  const images = needsImagePass ? findRecompressibleImages(doc) : []

  if (images.length > 0) {
    const steps = buildPdfSteps(options.pdfMaxDimension, options.pdfImageQuality)
    const totalSteps = steps.length
    for (const [i, step] of steps.entries()) {
      if (i > 0 && bytes.length <= maxBytes) break
      if (!hasExplicitImageSettings && bytes.length <= maxBytes) break
      signal.throwIfAborted()
      onStatus('Compressing pages…')
      onProgress(i / totalSteps)
      await recompressImages(doc, images, step, signal)
      bytes = await doc.save({ useObjectStreams: true })
    }
  }
  onProgress(1)

  if (!options.stripHiddenData && bytes.length >= original.length) return toResult(original)
  return toResult(bytes)
}

function buildPdfSteps(
  maxDim?: number | null,
  qualityCap?: number | null,
): PdfImageStep[] {
  const dim = maxDim === 0 || maxDim == null ? Number.POSITIVE_INFINITY : maxDim
  const qual = qualityCap ?? 1
  const adjusted = PDF_IMAGE_STEPS.map((s) => ({
    maxLongSide: maxDim === 0 ? Number.POSITIVE_INFINITY : Math.min(s.maxLongSide, dim),
    quality: Math.min(s.quality, qual),
  }))
  const deduped: PdfImageStep[] = []
  for (const step of adjusted) {
    const prev = deduped[deduped.length - 1]
    if (!prev || prev.maxLongSide !== step.maxLongSide || prev.quality !== step.quality) {
      deduped.push(step)
    }
  }
  return deduped
}

function stripMetadata(doc: PDFDocument): void {
  const info = doc.context.lookup(doc.context.trailerInfo.Info)
  if (info instanceof PDFDict) for (const key of info.keys()) info.delete(key)

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
  if (colorSpace instanceof PDFArray && colorSpace.lookup(0) === name('ICCBased')) {
    const profile = doc.context.lookup(colorSpace.get(1))
    const components = profile instanceof PDFStream ? profile.dict.lookup(name('N')) : undefined
    return components instanceof PDFNumber && [1, 3].includes(components.asNumber())
  }
  return false
}

async function recompressImages(
  doc: PDFDocument,
  images: PdfImage[],
  step: PdfImageStep,
  signal: AbortSignal,
): Promise<void> {
  for (const image of images) {
    signal.throwIfAborted()
    const source = new Blob([image.original.contents.slice()], { type: 'image/jpeg' })
    const bitmap = await createImageBitmap(source, { imageOrientation: 'none' }).catch(() => null)
    if (!bitmap) continue
    try {
      const scale = Math.min(1, step.maxLongSide / Math.max(bitmap.width, bitmap.height))
      const jpeg = new Uint8Array(
        await (await createImageRenderer(bitmap)(scale, step.quality)).arrayBuffer(),
      )
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
