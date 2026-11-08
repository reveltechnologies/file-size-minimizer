import type { CompressOptions, FileCategory, ImageFormat } from '@revel/core'

export type ProgressStep = 'prepare' | 'shrink' | 'done'

export interface CompressJob {
  files: File[]
  category: FileCategory
  maxBytes: number
  options: CompressOptions
  allowBlurry?: boolean
  imageFormat?: ImageFormat
  onStep: (step: ProgressStep) => void
  onProgress: (ratio: number) => void
  onStatus: (message: string) => void
  signal: AbortSignal
}

export interface CompressResult {
  blob: Blob
  fileName: string
}

export class BlurryVideoError extends Error {}
