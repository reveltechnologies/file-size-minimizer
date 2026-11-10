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
  it('plans video and audio bitrates within the safety factor', () => {
    const plan = calculateBitrate({ maxBytes: 10 * MB, durationSec: 60 })
    expect(plan).toEqual({ totalKbps: 1253, videoKbps: 1125, audioKbps: 128, feasible: true, possible: true })
    expect(estimateBytes(plan, 60)).toBeLessThanOrEqual(10 * MB * SAFETY_FACTOR)
  })

  it('allocates full budget to video when muted', () => {
    const plan = calculateBitrate({ maxBytes: 10 * MB, durationSec: 60, audioKbps: 0 })
    expect(plan.videoKbps).toBe(1253)
  })

  it('flags low-bitrate and impossible plans', () => {
    expect(calculateBitrate({ maxBytes: 10 * MB, durationSec: 600 })).toMatchObject({
      feasible: false,
      possible: false,
    })
    expect(calculateBitrate({ maxBytes: 10 * MB, durationSec: 600, audioKbps: 0 })).toMatchObject({
      videoKbps: 125,
      feasible: false,
      possible: true,
    })
  })

  it('caps bitrate and budget below sourceBytes to prevent file inflation', () => {
    const sourceBytes = 894 * 1024
    const plan = calculateBitrate({ maxBytes: 10 * MB, durationSec: 10, sourceBytes })
    expect(estimateBytes(plan, 10)).toBeLessThan(sourceBytes)
    expect(plan.videoKbps).toBeLessThan((sourceBytes * 8) / 1000 / 10)
  })

  it('rejects invalid input', () => {
    expect(() => calculateBitrate({ maxBytes: 10 * MB, durationSec: 0 })).toThrow(RangeError)
    expect(() => calculateBitrate({ maxBytes: 0, durationSec: 60 })).toThrow(RangeError)
  })
})

describe('correctForOvershoot', () => {
  it('lowers video bitrate after an overshoot', () => {
    const plan = calculateBitrate({ maxBytes: 10 * MB, durationSec: 60 })
    const actualBytes = ((plan.videoKbps * 1.1 + plan.audioKbps) * 1000 * 60) / 8
    const retry = correctForOvershoot(plan, 60, actualBytes, 10 * MB)

    expect(retry.videoKbps).toBeLessThan(plan.videoKbps)
    expect(retry.audioKbps).toBe(plan.audioKbps)
  })
})

describe('pickOutputSize and pickOutputFps', () => {
  it('scales dimensions by bitrate without upscaling and keeps even values', () => {
    expect(pickOutputSize(2500, { width: 1920, height: 1080 })).toEqual({ width: 1920, height: 1080 })
    expect(pickOutputSize(1500, { width: 1920, height: 1080 })).toEqual({ width: 1280, height: 720 })
    expect(pickOutputSize(500, { width: 1080, height: 1920 })).toEqual({ width: 480, height: 852 })
    expect(pickOutputSize(5000, { width: 641, height: 361 })).toEqual({ width: 640, height: 360 })
  })

  it('caps frame rate at 30', () => {
    expect(pickOutputFps(60)).toBe(30)
    expect(pickOutputFps(24)).toBe(24)
  })
})
