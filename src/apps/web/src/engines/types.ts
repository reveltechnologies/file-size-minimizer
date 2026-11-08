import type { CompressOptions, FileCategory, ImageFormat } from '@revel/core'

/** The steps shown to the user while a file is being shrunk. */
export type ProgressStep = 'prepare' | 'shrink' | 'done'

export interface CompressJob {
  /** One file, except when several photos are combined into one PDF. */
  files: File[]
  category: FileCategory
  maxBytes: number
  options: CompressOptions
  /** Video only: the user accepted a blurry result for a video too long for the target. */
  allowBlurry?: boolean
  /** Photo only: what to save it as. Defaults to JPEG. */
  imageFormat?: ImageFormat
  /** Called once the real shrinking starts; everything before it counts as preparing. */
  onStep: (step: ProgressStep) => void
  /** Called with 0…1 as the current stage progresses. A new pass may start again at 0. */
  onProgress: (ratio: number) => void
  /** Short, friendly description of the current stage, e.g. "Looking at your video…". */
  onStatus: (message: string) => void
  signal: AbortSignal
}

export interface CompressResult {
  blob: Blob
  fileName: string
}

/** Thrown when only a blurry video would fit and the user hasn't accepted that yet. */
export class BlurryVideoError extends Error {}
