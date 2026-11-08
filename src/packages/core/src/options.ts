export interface CompressOptions {
  stripHiddenData: boolean
  smartOptimize: boolean
  muteAudio: boolean
}

export const DEFAULT_OPTIONS: CompressOptions = {
  stripHiddenData: true,
  smartOptimize: true,
  muteAudio: false,
}
