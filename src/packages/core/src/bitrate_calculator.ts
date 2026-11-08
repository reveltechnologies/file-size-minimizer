export const SAFETY_FACTOR = 0.94
export const DEFAULT_AUDIO_KBPS = 128
export const MIN_VIDEO_KBPS = 150
export const MIN_BLURRY_VIDEO_KBPS = 40
export const MAX_SMART_FPS = 30

export interface BitrateInput {
  maxBytes: number
  durationSec: number
  audioKbps?: number
}

export interface BitratePlan {
  totalKbps: number
  videoKbps: number
  audioKbps: number
  feasible: boolean
  possible: boolean
}

export function calculateBitrate({
  maxBytes,
  durationSec,
  audioKbps = DEFAULT_AUDIO_KBPS,
}: BitrateInput): BitratePlan {
  if (!(maxBytes > 0)) throw new RangeError(`maxBytes must be positive, got ${maxBytes}`)
  if (!(durationSec > 0)) throw new RangeError(`durationSec must be positive, got ${durationSec}`)
  if (!(audioKbps >= 0)) throw new RangeError(`audioKbps must be zero or more, got ${audioKbps}`)

  const totalKbps = Math.floor((maxBytes * 8 * SAFETY_FACTOR) / 1000 / durationSec)
  const videoKbps = totalKbps - audioKbps

  return { totalKbps, videoKbps, audioKbps, ...quality(videoKbps) }
}

export function correctForOvershoot(
  plan: BitratePlan,
  durationSec: number,
  actualBytes: number,
  maxBytes: number,
): BitratePlan {
  const actualVideoKbps = (actualBytes * 8) / 1000 / durationSec - plan.audioKbps
  const overshoot = Math.max(1, actualVideoKbps / plan.videoKbps)
  const budgetVideoKbps = (maxBytes * 8 * SAFETY_FACTOR) / 1000 / durationSec - plan.audioKbps
  const videoKbps = Math.floor((budgetVideoKbps / overshoot) * 0.97)

  return {
    totalKbps: videoKbps + plan.audioKbps,
    videoKbps,
    audioKbps: plan.audioKbps,
    ...quality(videoKbps),
  }
}

function quality(videoKbps: number): Pick<BitratePlan, 'feasible' | 'possible'> {
  return { feasible: videoKbps >= MIN_VIDEO_KBPS, possible: videoKbps >= MIN_BLURRY_VIDEO_KBPS }
}

export interface Dimensions {
  width: number
  height: number
}

export function shortSideCap(videoKbps: number): number {
  return videoKbps >= 2500 ? 1080 : videoKbps >= 1000 ? 720 : videoKbps >= MIN_VIDEO_KBPS ? 480 : 240
}

export function pickOutputSize(videoKbps: number, source: Dimensions): Dimensions {
  const scale = Math.min(1, shortSideCap(videoKbps) / Math.min(source.width, source.height))

  return { width: toEven(source.width * scale), height: toEven(source.height * scale) }
}

export function pickOutputFps(sourceFps: number): number {
  return Math.min(sourceFps, MAX_SMART_FPS)
}

export function estimateBytes(plan: BitratePlan, durationSec: number): number {
  return ((plan.videoKbps + plan.audioKbps) * 1000 * durationSec) / 8
}

function toEven(n: number): number {
  return Math.max(2, Math.floor(n / 2) * 2)
}
