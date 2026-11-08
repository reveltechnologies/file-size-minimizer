import { describe, expect, it } from 'vitest'
import { isPng, pngMayHaveTransparency, stripPngMetadata } from './png_metadata'

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0))

/** A chunk with a dummy CRC; nothing here checks it. */
function chunk(type: string, data: number[]): number[] {
  const length = data.length
  return [length >>> 24, (length >> 16) & 0xff, (length >> 8) & 0xff, length & 0xff, ...ascii(type), ...data, 1, 2, 3, 4]
}

/** 1×1 image with the given IHDR colour type. */
const ihdr = (colorType: number) => chunk('IHDR', [0, 0, 0, 1, 0, 0, 0, 1, 8, colorType, 0, 0, 0])
const IDAT = chunk('IDAT', [0x78, 0x9c, 0x63, 0x60])
const IEND = chunk('IEND', [])
const SRGB = chunk('sRGB', [0])
const TRNS = chunk('tRNS', [0, 0])
const TEXT = chunk('tEXt', [...ascii('Author'), 0, ...ascii('Jane')])
const EXIF = chunk('eXIf', ascii('MM\0*gps'))
const TIME = chunk('tIME', [7, 234, 10, 29, 12, 0, 0])
const PRIVATE = chunk('prVt', [1, 2, 3])

function png(...chunks: number[][]): Uint8Array {
  return new Uint8Array([...SIGNATURE, ...chunks.flat()])
}

describe('stripPngMetadata', () => {
  it('drops text, EXIF, timestamps and private chunks but keeps the picture and its colours', () => {
    const stripped = stripPngMetadata(png(ihdr(6), SRGB, TEXT, EXIF, TIME, PRIVATE, IDAT, IEND))

    expect(stripped).toEqual(png(ihdr(6), SRGB, IDAT, IEND))
  })

  it('keeps transparency', () => {
    const source = png(ihdr(2), TRNS, IDAT, IEND)
    expect(stripPngMetadata(source)).toEqual(source)
  })

  it('returns null for files it cannot read', () => {
    expect(stripPngMetadata(new Uint8Array([0xff, 0xd8, 0xff]))).toBeNull()
    // Cut off before IEND.
    expect(stripPngMetadata(png(ihdr(6), IDAT))).toBeNull()
  })
})

describe('pngMayHaveTransparency', () => {
  it('is true for an alpha channel or a tRNS chunk', () => {
    expect(pngMayHaveTransparency(png(ihdr(6), IDAT, IEND))).toBe(true)
    expect(pngMayHaveTransparency(png(ihdr(4), IDAT, IEND))).toBe(true)
    expect(pngMayHaveTransparency(png(ihdr(2), TRNS, IDAT, IEND))).toBe(true)
  })

  it('is false for plain RGB, greyscale and palette images', () => {
    expect(pngMayHaveTransparency(png(ihdr(2), IDAT, IEND))).toBe(false)
    expect(pngMayHaveTransparency(png(ihdr(0), IDAT, IEND))).toBe(false)
    expect(pngMayHaveTransparency(png(ihdr(3), IDAT, IEND))).toBe(false)
  })

  it('is null when the file is not a PNG', () => {
    expect(pngMayHaveTransparency(new Uint8Array([0xff, 0xd8, 0xff]))).toBeNull()
    expect(isPng(new Uint8Array(SIGNATURE))).toBe(true)
  })
})
