export interface CompressOptions {
  stripHiddenData: boolean
  smartOptimize: boolean
  muteAudio: boolean
  imageKeepDimensions?: boolean
  imageMaxDimension?: number | null
  imageScalePercent?: number | null
  imageQuality?: number | null
  imageGrayscale?: boolean
  /** 0 = original resolution, null/undefined = auto, >0 = max short-side px */
  videoMaxHeight?: number | null
  /** 0 = original frame rate, null/undefined = auto, >0 = max fps */
  videoMaxFps?: number | null
  videoAudioKbps?: number
  /** 0 = original embedded image size, null/undefined = auto, >0 = max long-side px */
  pdfMaxDimension?: number | null
  pdfImageQuality?: number | null
  textMode?: 'minify' | 'gzip'
  textStripComments?: boolean
  textRemoveBlankLines?: boolean
  textCompactIndent?: boolean
}

export const DEFAULT_OPTIONS: CompressOptions = {
  stripHiddenData: true,
  smartOptimize: true,
  muteAudio: false,
}
