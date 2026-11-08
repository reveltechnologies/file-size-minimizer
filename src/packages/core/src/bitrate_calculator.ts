/**
 * "Fit-to-Size" video math, shared by the web (ffmpeg.wasm) and Android
 * (ffmpeg-kit) encoders.
 *
 * All bitrates are in kbps where 1 kbps = 1000 bits/s, the unit ffmpeg uses
 * for `-b:v 1200k`.
 */

/** Share of the target spent on audio + video; the other 6% absorbs container overhead. */
export const SAFETY_FACTOR = 0.94
export const DEFAULT_AUDIO_KBPS = 128
/** Below this the picture turns to mush, so we warn and only go ahead if the user accepts. */
export const MIN_VIDEO_KBPS = 150
/** Below this even a 240p video can't hit the target, so we refuse. */
export const MIN_BLURRY_VIDEO_KBPS = 40
export const MAX_SMART_FPS = 30

export interface BitrateInput {
  maxBytes: number
  durationSec: number
  /** 0 when the user ticks "Mute Audio". */
  audioKbps?: number
}

export interface BitratePlan {
  totalKbps: number
  videoKbps: number
  audioKbps: number
  /** False when the video is too long to look acceptable at this size. */
  feasible: boolean
  /** False when it can't fit at all, even blurry. */
  possible: boolean
}

/** Video Bitrate = (Target × 0.94 / Duration) − Audio. */
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

/**
 * Single-pass encoders can overshoot their target bitrate. Given the size
 * the last attempt actually produced, plan a lower video bitrate that
 * lands back inside the 94% target.
 */
export function correctForOvershoot(
  plan: BitratePlan,
  durationSec: number,
  actualBytes: number,
  maxBytes: number,
): BitratePlan {
  const actualVideoKbps = (actualBytes * 8) / 1000 / durationSec - plan.audioKbps
  const overshoot = Math.max(1, actualVideoKbps / plan.videoKbps)
  const budgetVideoKbps = (maxBytes * 8 * SAFETY_FACTOR) / 1000 / durationSec - plan.audioKbps
  // Extra 3% so the retry doesn't land right on the edge again.
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

/**
 * Smart Visual Optimization: drop to 720p below 2500 kbps, 480p below
 * 1000 kbps and 240p for blurry videos below MIN_VIDEO_KBPS. "720p" means
 * the short side, so portrait phone videos (1080×1920) scale correctly.
 */
export function shortSideCap(videoKbps: number): number {
  return videoKbps >= 2500 ? 1080 : videoKbps >= 1000 ? 720 : videoKbps >= MIN_VIDEO_KBPS ? 480 : 240
}

/** Never upscales; always returns even dimensions because H.264 with yuv420p requires them. */
export function pickOutputSize(videoKbps: number, source: Dimensions): Dimensions {
  const scale = Math.min(1, shortSideCap(videoKbps) / Math.min(source.width, source.height))

  return { width: toEven(source.width * scale), height: toEven(source.height * scale) }
}

/** 60 FPS → 30 FPS; slower sources are left alone. */
export function pickOutputFps(sourceFps: number): number {
  return Math.min(sourceFps, MAX_SMART_FPS)
}

/** Expected output size in bytes, before container overhead. */
export function estimateBytes(plan: BitratePlan, durationSec: number): number {
  return ((plan.videoKbps + plan.audioKbps) * 1000 * durationSec) / 8
}

function toEven(n: number): number {
  return Math.max(2, Math.floor(n / 2) * 2)
}
