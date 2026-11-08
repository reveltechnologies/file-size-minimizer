export const MAX_IMAGE_LONG_SIDE = 4096
export const MIN_IMAGE_LONG_SIDE = 320
export const MIN_JPEG_QUALITY = 0.5
export const MAX_JPEG_QUALITY = 0.92
const QUALITY_SEARCH_STEPS = 5
const MAX_SCALE_ROUNDS = 6
const MAX_LOSSLESS_SCALE_ROUNDS = 8

export interface ImageEncodeAttempt {
  scale: number
  quality: number
}

export interface Encoded<T> {
  output: T
  bytes: number
}

export type FittedImage<T> = Encoded<T> & ImageEncodeAttempt

export interface ScaleRange {
  initialScale: number
  minScale: number
}

export function imageScaleRange(width: number, height: number): ScaleRange {
  const longSide = Math.max(width, height)
  return {
    initialScale: Math.min(1, MAX_IMAGE_LONG_SIDE / longSide),
    minScale: Math.min(1, MIN_IMAGE_LONG_SIDE / longSide),
  }
}

export async function fitImageToSize<T>(
  encode: (attempt: ImageEncodeAttempt) => Promise<Encoded<T>>,
  maxBytes: number,
  { initialScale, minScale }: ScaleRange = { initialScale: 1, minScale: 0 },
): Promise<FittedImage<T> | null> {
  let scale = initialScale

  for (let round = 0; round < MAX_SCALE_ROUNDS; round++) {
    const best = await encode({ scale, quality: MAX_JPEG_QUALITY })
    if (best.bytes <= maxBytes) return { ...best, scale, quality: MAX_JPEG_QUALITY }

    const worst = await encode({ scale, quality: MIN_JPEG_QUALITY })
    if (worst.bytes <= maxBytes) {
      let fitted: FittedImage<T> = { ...worst, scale, quality: MIN_JPEG_QUALITY }
      let low = MIN_JPEG_QUALITY
      let high = MAX_JPEG_QUALITY
      for (let i = 0; i < QUALITY_SEARCH_STEPS; i++) {
        const quality = (low + high) / 2
        const attempt = await encode({ scale, quality })
        if (attempt.bytes <= maxBytes) {
          fitted = { ...attempt, scale, quality }
          low = quality
        } else {
          high = quality
        }
      }
      return fitted
    }

    if (scale <= minScale) return null
    scale = nextScale(scale, minScale, maxBytes, worst.bytes)
  }
  return null
}

export async function fitLosslessImageToSize<T>(
  encode: (scale: number) => Promise<Encoded<T>>,
  maxBytes: number,
  { initialScale, minScale }: ScaleRange = { initialScale: 1, minScale: 0 },
): Promise<(Encoded<T> & { scale: number }) | null> {
  let scale = initialScale

  for (let round = 0; round < MAX_LOSSLESS_SCALE_ROUNDS; round++) {
    const attempt = await encode(scale)
    if (attempt.bytes <= maxBytes) return { ...attempt, scale }
    if (scale <= minScale) return null
    scale = nextScale(scale, minScale, maxBytes, attempt.bytes)
  }
  return null
}

function nextScale(scale: number, minScale: number, maxBytes: number, bytes: number): number {
  return Math.max(minScale, scale * Math.min(0.9, Math.sqrt(maxBytes / bytes) * 0.95))
}

export interface PdfImageStep {
  maxLongSide: number
  quality: number
}

export const PDF_IMAGE_STEPS: readonly PdfImageStep[] = [
  { maxLongSide: 1754, quality: 0.8 },
  { maxLongSide: 1754, quality: 0.65 },
  { maxLongSide: 1400, quality: 0.6 },
  { maxLongSide: 1240, quality: 0.5 },
  { maxLongSide: 1000, quality: 0.45 },
  { maxLongSide: 850, quality: 0.4 },
]
