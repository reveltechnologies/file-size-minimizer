import type { FileCategory } from './presets'

/** What a photo is saved as. JPEG is the default: smallest, and accepted everywhere. */
export type ImageFormat = 'jpeg' | 'png'

interface OutputType {
  extension: string
  mimeType: string
}

const CATEGORIES: readonly FileCategory[] = ['video', 'image', 'pdf']

const INPUT_EXTENSIONS: Record<FileCategory, readonly string[]> = {
  video: ['mp4', 'mov', 'webm', 'mkv', 'gif'],
  image: ['heic', 'heif', 'webp', 'png', 'jpg', 'jpeg'],
  pdf: ['pdf'],
}

/** Sources that can have see-through areas, which JPEG can't keep. */
const PNG_OUTPUT_SOURCES = { extensions: ['png', 'webp'], mimeTypes: ['image/png', 'image/webp'] }

const OUTPUT: Record<Exclude<FileCategory, 'image'>, OutputType> = {
  video: { extension: 'mp4', mimeType: 'video/mp4' },
  pdf: { extension: 'pdf', mimeType: 'application/pdf' },
}

const IMAGE_OUTPUT: Record<ImageFormat, OutputType> = {
  jpeg: { extension: 'jpg', mimeType: 'image/jpeg' },
  png: { extension: 'png', mimeType: 'image/png' },
}

export const ACCEPTED_EXTENSIONS: readonly string[] = CATEGORIES.flatMap((c) => INPUT_EXTENSIONS[c])

/**
 * Detects by extension first: browsers and Android often report HEIC and MKV
 * with an empty or generic MIME type. Falls back to the MIME type for
 * Android content:// URIs that arrive without a file name.
 */
export function detectCategory(fileName: string, mimeType = ''): FileCategory | null {
  const extension = extensionOf(fileName)
  const byExtension = CATEGORIES.find((c) => INPUT_EXTENSIONS[c].includes(extension))
  if (byExtension) return byExtension

  if (mimeType.startsWith('video/') || mimeType === 'image/gif') return 'video'
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType === 'application/pdf') return 'pdf'
  return null
}

/** PNG and WebP photos may be saved as PNG to keep transparency; everything else becomes JPEG. */
export function offersPngOutput(fileName: string, mimeType = ''): boolean {
  const extension = extensionOf(fileName)
  if (extension) return PNG_OUTPUT_SOURCES.extensions.includes(extension)
  return PNG_OUTPUT_SOURCES.mimeTypes.includes(mimeType)
}

export function isJpegFile(fileName: string, mimeType = ''): boolean {
  const extension = extensionOf(fileName)
  if (extension) return extension === 'jpg' || extension === 'jpeg'
  return mimeType === 'image/jpeg'
}

/** "IMG_1234.MOV" → "IMG_1234-fit.mp4" */
export function outputFileName(inputName: string, category: FileCategory, imageFormat: ImageFormat = 'jpeg'): string {
  const dot = inputName.lastIndexOf('.')
  const base = dot > 0 ? inputName.slice(0, dot) : inputName || 'file'
  return `${base}-fit.${outputType(category, imageFormat).extension}`
}

export function outputMimeType(category: FileCategory, imageFormat: ImageFormat = 'jpeg'): string {
  return outputType(category, imageFormat).mimeType
}

function outputType(category: FileCategory, imageFormat: ImageFormat): OutputType {
  return category === 'image' ? IMAGE_OUTPUT[imageFormat] : OUTPUT[category]
}

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  return dot > 0 ? fileName.slice(dot + 1).toLowerCase() : ''
}
