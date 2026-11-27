import type { FileCategory } from './presets'

export type ImageFormat = 'jpeg' | 'webp' | 'png'
export type TextMode = 'minify' | 'gzip'

interface OutputType {
  extension: string
  mimeType: string
}

const CATEGORIES: readonly FileCategory[] = ['video', 'image', 'pdf', 'text']

const INPUT_EXTENSIONS: Record<FileCategory, readonly string[]> = {
  video: ['mp4', 'mov', 'webm', 'mkv', 'gif'],
  image: ['heic', 'heif', 'webp', 'png', 'jpg', 'jpeg'],
  pdf: ['pdf'],
  text: [
    'txt',
    'log',
    'md',
    'markdown',
    'csv',
    'tsv',
    'json',
    'xml',
    'svg',
    'html',
    'htm',
    'css',
    'scss',
    'less',
    'js',
    'mjs',
    'cjs',
    'jsx',
    'ts',
    'tsx',
    'py',
    'yaml',
    'yml',
    'toml',
    'ini',
    'cfg',
    'conf',
    'sql',
    'sh',
    'bash',
    'c',
    'h',
    'cpp',
    'hpp',
    'java',
    'kt',
    'go',
    'rs',
    'rb',
    'php',
    'cs',
    'swift',
    'env',
    'properties',
    'srt',
    'vtt',
  ],
}

const PNG_OUTPUT_SOURCES = {
  extensions: ['png', 'webp'],
  mimeTypes: ['image/png', 'image/webp'],
}

const OUTPUT: Record<Exclude<FileCategory, 'image' | 'text'>, OutputType> = {
  video: { extension: 'mp4', mimeType: 'video/mp4' },
  pdf: { extension: 'pdf', mimeType: 'application/pdf' },
}

const IMAGE_OUTPUT: Record<ImageFormat, OutputType> = {
  jpeg: { extension: 'jpg', mimeType: 'image/jpeg' },
  webp: { extension: 'webp', mimeType: 'image/webp' },
  png: { extension: 'png', mimeType: 'image/png' },
}

export const ACCEPTED_EXTENSIONS: readonly string[] = CATEGORIES.flatMap((c) => INPUT_EXTENSIONS[c])

export function detectCategory(fileName: string, mimeType = ''): FileCategory | null {
  const extension = extensionOf(fileName)
  const byExtension = CATEGORIES.find((c) => INPUT_EXTENSIONS[c].includes(extension))
  if (byExtension) return byExtension

  const mime = mimeType.toLowerCase()
  if (
    mime === 'image/svg+xml' ||
    mime.startsWith('text/') ||
    mime === 'application/json' ||
    mime.endsWith('+json') ||
    mime === 'application/xml' ||
    mime.endsWith('+xml') ||
    mime === 'application/javascript' ||
    mime === 'application/x-sh'
  ) {
    return 'text'
  }
  if (mime.startsWith('video/') || mime === 'image/gif') return 'video'
  if (mime.startsWith('image/')) return 'image'
  if (mime === 'application/pdf') return 'pdf'
  return null
}

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

export function outputFileName(
  inputName: string,
  category: FileCategory,
  imageFormat: ImageFormat = 'jpeg',
): string {
  const dot = inputName.lastIndexOf('.')
  const base = dot > 0 ? inputName.slice(0, dot) : inputName || 'file'
  if (category === 'text') {
    const ext = dot > 0 ? inputName.slice(dot + 1) : 'txt'
    return `${base}-fit.${ext}`
  }
  return `${base}-fit.${outputType(category, imageFormat).extension}`
}

export function outputMimeType(category: FileCategory, imageFormat: ImageFormat = 'jpeg'): string {
  if (category === 'text') return 'text/plain;charset=utf-8'
  return outputType(category, imageFormat).mimeType
}

export function textOutputFileName(inputName: string, mode: TextMode): string {
  if (mode === 'gzip') return `${inputName || 'file'}.gz`
  return outputFileName(inputName, 'text')
}

export function textOutputMimeType(fileName: string, mode: TextMode): string {
  if (mode === 'gzip') return 'application/gzip'
  const ext = extensionOf(fileName)
  if (ext === 'json') return 'application/json;charset=utf-8'
  if (ext === 'xml') return 'application/xml;charset=utf-8'
  if (ext === 'svg') return 'image/svg+xml;charset=utf-8'
  if (ext === 'html' || ext === 'htm') return 'text/html;charset=utf-8'
  if (ext === 'css') return 'text/css;charset=utf-8'
  if (ext === 'csv') return 'text/csv;charset=utf-8'
  return 'text/plain;charset=utf-8'
}

function outputType(category: Exclude<FileCategory, 'text'>, imageFormat: ImageFormat): OutputType {
  return category === 'image' ? IMAGE_OUTPUT[imageFormat] : OUTPUT[category]
}

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  return dot > 0 ? fileName.slice(dot + 1).toLowerCase() : ''
}
