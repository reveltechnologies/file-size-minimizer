import { useEffect, useState } from 'react'
import { probeVideo, type VideoInfo } from './probeVideo'

export type VideoProbeState = {
  status: 'idle' | 'loading' | 'ready' | 'unsupported'
  info: VideoInfo | null
}

export function useVideoInfo(file: File | null): VideoProbeState {
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

  if (!file) return { status: 'idle', info: null }
  if (probe && probe.file === file) {
    return probe.info
      ? { status: 'ready', info: probe.info }
      : { status: 'unsupported', info: null }
  }
  return { status: 'loading', info: null }
}
