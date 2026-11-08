import { describe, expect, it } from 'vitest'
import { isPng, pngMayHaveTransparency, stripPngMetadata } from './png_metadata'

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0))

function chunk(type: string, data: number[]): number[] {
  const length = data.length
  return [length >>> 24, (length >> 16) & 0xff, (length >> 8) & 0xff, length & 0xff, ...ascii(type), ...data, 1, 2, 3, 4]
}

const ihdr = (colorType: number) => chunk('IHDR', [0, 0, 0, 1, 0, 0, 0, 1, 8, colorType, 0, 0, 0])
const IDAT = chunk('IDAT', [0x78, 0x9c, 0x63, 0x60])
const IEND = chunk('IEND', [])
const SRGB = chunk('sRGB', [0])
const TRNS = chunk('tRNS', [0, 0])
const TEXT = chunk('tEXt', [...ascii('Author'), 0, ...ascii('Jane')])
const EXIF = chunk('eXIf', ascii('MM\0*gps'))

function png(...chunks: number[][]): Uint8Array {
  return new Uint8Array([...SIGNATURE, ...chunks.flat()])
}

describe('stripPngMetadata', () => {
  it('strips metadata chunks while keeping image and color chunks', () => {
    const stripped = stripPngMetadata(png(ihdr(6), SRGB, TEXT, EXIF, IDAT, IEND))
    expect(stripped).toEqual(png(ihdr(6), SRGB, IDAT, IEND))
  })

  it('returns null for invalid PNGs', () => {
    expect(stripPngMetadata(new Uint8Array([0xff, 0xd8, 0xff]))).toBeNull()
    expect(stripPngMetadata(png(ihdr(6), IDAT))).toBeNull()
  })
})

describe('pngMayHaveTransparency', () => {
  it('detects alpha channel and tRNS chunks', () => {
    expect(pngMayHaveTransparency(png(ihdr(6), IDAT, IEND))).toBe(true)
    expect(pngMayHaveTransparency(png(ihdr(2), TRNS, IDAT, IEND))).toBe(true)
    expect(pngMayHaveTransparency(png(ihdr(2), IDAT, IEND))).toBe(false)
    expect(isPng(new Uint8Array(SIGNATURE))).toBe(true)
  })
})
