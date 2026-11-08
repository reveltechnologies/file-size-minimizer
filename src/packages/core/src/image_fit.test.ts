import { describe, expect, it } from 'vitest'
import {
  fitImageToSize,
  fitLosslessImageToSize,
  imageScaleRange,
  MAX_JPEG_QUALITY,
  MIN_JPEG_QUALITY,
  type ImageEncodeAttempt,
} from './image_fit'
import { KB, MB } from './presets'

function fakeEncoder(fullSizeBytesAtMaxQuality: number) {
  const attempts: ImageEncodeAttempt[] = []
  const encode = async (attempt: ImageEncodeAttempt) => {
    attempts.push(attempt)
    const qualityFactor = 0.15 + 0.85 * (attempt.quality / MAX_JPEG_QUALITY) ** 2
    const bytes = Math.round(fullSizeBytesAtMaxQuality * attempt.scale ** 2 * qualityFactor)
    return { output: attempt, bytes }
  }
  return { encode, attempts }
}

describe('fitImageToSize', () => {
  it('keeps full size when already under limit', async () => {
    const { encode, attempts } = fakeEncoder(300 * KB)
    const fitted = await fitImageToSize(encode, 500 * KB)

    expect(fitted).toMatchObject({ scale: 1, quality: MAX_JPEG_QUALITY })
    expect(attempts).toHaveLength(1)
  })

  it('lowers quality before scaling down', async () => {
    const { encode } = fakeEncoder(700 * KB)
    const fitted = await fitImageToSize(encode, 500 * KB)

    expect(fitted?.scale).toBe(1)
    expect(fitted?.quality).toBeGreaterThan(MIN_JPEG_QUALITY)
    expect(fitted?.bytes).toBeLessThanOrEqual(500 * KB)
  })

  it('scales dimensions when minimum quality is still over limit', async () => {
    const { encode } = fakeEncoder(8 * MB)
    const fitted = await fitImageToSize(encode, 500 * KB)

    expect(fitted?.scale).toBeLessThan(1)
    expect(fitted?.bytes).toBeLessThanOrEqual(500 * KB)
  })

  it('returns null when minScale cannot fit target', async () => {
    const { encode } = fakeEncoder(10 * MB)
    expect(await fitImageToSize(encode, 1 * KB, { initialScale: 1, minScale: 0.1 })).toBeNull()
  })
})

describe('fitLosslessImageToSize', () => {
  it('scales dimensions until under limit', async () => {
    const encode = async (scale: number) => ({
      output: scale,
      bytes: Math.round(4 * MB * scale ** 2),
    })
    const fitted = await fitLosslessImageToSize(encode, 500 * KB)
    expect(fitted?.scale).toBeLessThan(1)
    expect(fitted?.bytes).toBeLessThanOrEqual(500 * KB)
  })
})

describe('imageScaleRange', () => {
  it('computes initial and minimum scale bounds', () => {
    expect(imageScaleRange(8192, 6144)).toEqual({ initialScale: 0.5, minScale: 320 / 8192 })
    expect(imageScaleRange(200, 100)).toEqual({ initialScale: 1, minScale: 1 })
  })
})
