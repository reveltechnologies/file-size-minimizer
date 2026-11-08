import { describe, expect, it } from 'vitest'
import {
  calculateBitrate,
  correctForOvershoot,
  estimateBytes,
  pickOutputFps,
  pickOutputSize,
  SAFETY_FACTOR,
} from './bitrate_calculator'
import { MB } from './presets'

describe('calculateBitrate', () => {
  it('fits a 60 s clip into Discord’s 10 MB with audio', () => {
    const plan = calculateBitrate({ maxBytes: 10 * MB, durationSec: 60 })

    expect(plan).toEqual({ totalKbps: 1253, videoKbps: 1125, audioKbps: 128, feasible: true, possible: true })
  })

  it('gives the whole budget to video when muted', () => {
    const plan = calculateBitrate({ maxBytes: 10 * MB, durationSec: 60, audioKbps: 0 })

    expect(plan.videoKbps).toBe(1253)
  })

  it('never plans past the 94% safety target', () => {
    for (const durationSec of [1, 7.3, 30, 61.5, 180, 600]) {
      for (const maxBytes of [10 * MB, 16 * MB, 25 * MB]) {
        const plan = calculateBitrate({ maxBytes, durationSec })
        expect(estimateBytes(plan, durationSec)).toBeLessThanOrEqual(maxBytes * SAFETY_FACTOR)
      }
    }
  })

  it('flags videos too long to look good, but still possible blurry', () => {
    // 10 min into 10 MB: 125 kbps total, nothing left for video with audio on.
    expect(calculateBitrate({ maxBytes: 10 * MB, durationSec: 600 })).toMatchObject({
      feasible: false,
      possible: false,
    })
    // Muted, all 125 kbps go to video: blurry but doable.
    expect(calculateBitrate({ maxBytes: 10 * MB, durationSec: 600, audioKbps: 0 })).toMatchObject({
      videoKbps: 125,
      feasible: false,
      possible: true,
    })
  })

  it('rejects invalid input', () => {
    expect(() => calculateBitrate({ maxBytes: 10 * MB, durationSec: 0 })).toThrow(RangeError)
    expect(() => calculateBitrate({ maxBytes: 10 * MB, durationSec: NaN })).toThrow(RangeError)
    expect(() => calculateBitrate({ maxBytes: 0, durationSec: 60 })).toThrow(RangeError)
    expect(() => calculateBitrate({ maxBytes: 10 * MB, durationSec: 60, audioKbps: -1 })).toThrow(
      RangeError,
    )
  })
})

describe('correctForOvershoot', () => {
  it('lowers the video bitrate so a 10% overshoot lands back under the target', () => {
    const plan = calculateBitrate({ maxBytes: 10 * MB, durationSec: 60 })
    const actualVideoKbps = plan.videoKbps * 1.1
    const actualBytes = ((actualVideoKbps + plan.audioKbps) * 1000 * 60) / 8

    const retry = correctForOvershoot(plan, 60, actualBytes, 10 * MB)
    const retryBytes = ((retry.videoKbps * 1.1 + retry.audioKbps) * 1000 * 60) / 8

    expect(retry.videoKbps).toBeLessThan(plan.videoKbps)
    expect(retry.audioKbps).toBe(plan.audioKbps)
    expect(retryBytes).toBeLessThanOrEqual(10 * MB * SAFETY_FACTOR)
  })
})

describe('pickOutputSize', () => {
  it('keeps 1080p at 2500 kbps and above', () => {
    expect(pickOutputSize(2500, { width: 1920, height: 1080 })).toEqual({ width: 1920, height: 1080 })
  })

  it('drops to 720p below 2500 kbps', () => {
    expect(pickOutputSize(1500, { width: 1920, height: 1080 })).toEqual({ width: 1280, height: 720 })
  })

  it('drops to 480p below 1000 kbps, measuring the short side of portrait video', () => {
    expect(pickOutputSize(500, { width: 1080, height: 1920 })).toEqual({ width: 480, height: 852 })
  })

  it('drops to 240p for blurry videos', () => {
    expect(pickOutputSize(100, { width: 1920, height: 1080 })).toEqual({ width: 426, height: 240 })
  })

  it('never upscales', () => {
    expect(pickOutputSize(5000, { width: 640, height: 360 })).toEqual({ width: 640, height: 360 })
  })

  it('rounds odd dimensions down to even', () => {
    expect(pickOutputSize(5000, { width: 641, height: 361 })).toEqual({ width: 640, height: 360 })
  })
})

describe('pickOutputFps', () => {
  it('caps 60 FPS at 30 and leaves 24 FPS alone', () => {
    expect(pickOutputFps(60)).toBe(30)
    expect(pickOutputFps(24)).toBe(24)
  })
})
