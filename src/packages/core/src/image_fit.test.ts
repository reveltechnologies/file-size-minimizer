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

/** Fake encoder: bytes grow with pixel count and quality, like a real JPEG. */
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
  it('keeps full size and best quality when the photo already fits', async () => {
    const { encode, attempts } = fakeEncoder(300 * KB)

    const fitted = await fitImageToSize(encode, 500 * KB)

    expect(fitted).toMatchObject({ scale: 1, quality: MAX_JPEG_QUALITY })
    expect(attempts).toHaveLength(1)
  })

  it('lowers quality before shrinking dimensions', async () => {
    const { encode } = fakeEncoder(700 * KB)

    const fitted = await fitImageToSize(encode, 500 * KB)

    expect(fitted?.scale).toBe(1)
    expect(fitted?.quality).toBeGreaterThan(MIN_JPEG_QUALITY)
    expect(fitted?.quality).toBeLessThan(MAX_JPEG_QUALITY)
    expect(fitted?.bytes).toBeLessThanOrEqual(500 * KB)
  })

  it('shrinks dimensions when even the lowest quality is too big', async () => {
    const { encode } = fakeEncoder(8 * MB)

    const fitted = await fitImageToSize(encode, 500 * KB)

    expect(fitted?.scale).toBeLessThan(1)
    expect(fitted?.bytes).toBeLessThanOrEqual(500 * KB)
  })

  it('gives up with null rather than going below the minimum size', async () => {
    const { encode, attempts } = fakeEncoder(10 * MB)

    expect(await fitImageToSize(encode, 1 * KB, { initialScale: 1, minScale: 0.1 })).toBeNull()
    expect(Math.min(...attempts.map((a) => a.scale))).toBe(0.1)
  })
})

describe('fitLosslessImageToSize', () => {
  /** Fake PNG encoder: bytes grow with pixel count only. */
  function fakeLosslessEncoder(fullSizeBytes: number) {
    const scales: number[] = []
    const encode = async (scale: number) => {
      scales.push(scale)
      return { output: scale, bytes: Math.round(fullSizeBytes * scale ** 2) }
    }
    return { encode, scales }
  }

  it('keeps full size when the image already fits', async () => {
    const { encode, scales } = fakeLosslessEncoder(300 * KB)

    expect(await fitLosslessImageToSize(encode, 500 * KB)).toMatchObject({ scale: 1, bytes: 300 * KB })
    expect(scales).toEqual([1])
  })

  it('shrinks dimensions until it fits', async () => {
    const { encode } = fakeLosslessEncoder(4 * MB)

    const fitted = await fitLosslessImageToSize(encode, 500 * KB)

    expect(fitted?.scale).toBeLessThan(1)
    expect(fitted?.bytes).toBeLessThanOrEqual(500 * KB)
  })

  it('gives up with null rather than going below the minimum size', async () => {
    const { encode, scales } = fakeLosslessEncoder(10 * MB)

    expect(await fitLosslessImageToSize(encode, 1 * KB, { initialScale: 1, minScale: 0.1 })).toBeNull()
    expect(Math.min(...scales)).toBe(0.1)
  })
})

describe('imageScaleRange', () => {
  it('caps the long side at 4096 px, never upscales, and stops at 320 px', () => {
    expect(imageScaleRange(8192, 6144)).toEqual({ initialScale: 0.5, minScale: 320 / 8192 })
    expect(imageScaleRange(4032, 3024).initialScale).toBe(1)
    expect(imageScaleRange(200, 100)).toEqual({ initialScale: 1, minScale: 1 })
  })
})
