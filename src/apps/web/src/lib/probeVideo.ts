export interface VideoInfo {
  durationSec: number
  width: number
  height: number
}

export function probeVideo(file: File): Promise<VideoInfo | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')

    const finish = (info: VideoInfo | null) => {
      video.onloadedmetadata = null
      video.onerror = null
      URL.revokeObjectURL(url)
      resolve(info)
    }

    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      const { duration, videoWidth, videoHeight } = video
      const valid = Number.isFinite(duration) && duration > 0 && videoWidth > 0
      finish(valid ? { durationSec: duration, width: videoWidth, height: videoHeight } : null)
    }
    video.onerror = () => finish(null)
    video.src = url
  })
}
