import { useEffect, useState } from 'react'
import { probeVideo, type VideoInfo } from './probeVideo'

export function useVideoInfo(file: File | null): VideoInfo | null {
  const [probe, setProbe] = useState<{ file: File; info: VideoInfo | null } | null>(null)

  useEffect(() => {
    if (!file) return
    let cancelled = false
    void probeVideo(file).then((info) => {
      if (!cancelled) setProbe({ file, info })
    })
    return () => {
      cancelled = true
    }
  }, [file])

  return probe && probe.file === file ? probe.info : null
}
