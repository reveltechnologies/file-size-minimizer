/** The three "Unseen Data" checkboxes. */
export interface CompressOptions {
  /** Remove EXIF, GPS, camera serials, author tags and sensor tracks. */
  stripHiddenData: boolean
  /** Video only: HDR → SDR, 60 → 30 FPS and automatic 1080p/720p/480p. */
  smartOptimize: boolean
  /** Video only: drop the audio track so all bits go to the picture. */
  muteAudio: boolean
}

export const DEFAULT_OPTIONS: CompressOptions = {
  stripHiddenData: true,
  smartOptimize: true,
  muteAudio: false,
}
