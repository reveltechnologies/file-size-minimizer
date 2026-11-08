import { describe, expect, it } from 'vitest'
import { extractExif, insertExif, stripJpegMetadata } from './jpeg_metadata'

function segment(marker: number, payload: number[]): number[] {
  const length = payload.length + 2
  return [0xff, marker, length >> 8, length & 0xff, ...payload]
}

const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0))

/** EXIF with one IFD0 entry: Orientation = 6 ("rotate 90°"). */
function exifSegment(littleEndian: boolean): number[] {
  const u16 = (n: number) => (littleEndian ? [n & 0xff, n >> 8] : [n >> 8, n & 0xff])
  const u32 = (n: number) => (littleEndian ? [...u16(n & 0xffff), ...u16(n >>> 16)] : [...u16(n >>> 16), ...u16(n & 0xffff)])
  const tiff = [
    ...(littleEndian ? ascii('II') : ascii('MM')),
    ...u16(42),
    ...u32(8), // IFD0 right after this 8-byte header
    ...u16(1), // one entry
    ...u16(0x0112), ...u16(3), ...u32(1), ...u16(6), 0, 0, // Orientation SHORT = 6
    ...u32(0), // no next IFD
  ]
  return segment(0xe1, [...ascii('Exif'), 0, 0, ...tiff])
}

const JFIF = segment(0xe0, [...ascii('JFIF'), 0, 1, 1, 0, 0, 1, 0, 1, 0, 0])
const ICC = segment(0xe2, [...ascii('ICC_PROFILE'), 0, 1, 1, 9, 9])
const XMP = segment(0xe1, [...ascii('http://ns.adobe.com/xap/1.0/'), 0, ...ascii('<gps/>')])
const COMMENT = segment(0xfe, ascii('shot at home'))
const PICTURE = [0xff, 0xda, 0x00, 0x02, 0x12, 0x34, 0x56, 0xff, 0xd9] // SOS … EOI

function jpeg(...parts: number[][]): Uint8Array {
  return new Uint8Array([0xff, 0xd8, ...parts.flat(), ...PICTURE])
}

function orientationOf(bytes: Uint8Array, littleEndian: boolean): number {
  const exif = extractExif(bytes)!
  const view = new DataView(exif.buffer, exif.byteOffset)
  // marker+length (4) + "Exif\0\0" (6) + TIFF header (8) + count (2) + tag/type/count (8)
  return view.getUint16(4 + 6 + 8 + 2 + 8, littleEndian)
}

describe('stripJpegMetadata', () => {
  it('removes EXIF, XMP and comments but keeps JFIF, the color profile and the picture', () => {
    const stripped = stripJpegMetadata(jpeg(JFIF, exifSegment(true), ICC, XMP, COMMENT))

    expect(stripped).toEqual(jpeg(JFIF, ICC))
  })

  it('returns null for non-JPEG input', () => {
    expect(stripJpegMetadata(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBeNull()
  })
})

describe('extractExif / insertExif', () => {
  it('finds the EXIF segment and ignores XMP', () => {
    expect(extractExif(jpeg(JFIF, XMP, exifSegment(false)))).toEqual(new Uint8Array(exifSegment(false)))
    expect(extractExif(jpeg(JFIF, XMP))).toBeNull()
  })

  it.each([true, false])('copies EXIF into a new JPEG with orientation reset (littleEndian=%s)', (littleEndian) => {
    const original = jpeg(JFIF, exifSegment(littleEndian))
    const reencoded = jpeg(JFIF)

    const result = insertExif(reencoded, extractExif(original)!)

    expect(orientationOf(original, littleEndian)).toBe(6)
    expect(orientationOf(result, littleEndian)).toBe(1)
    expect(result.subarray(-PICTURE.length)).toEqual(new Uint8Array(PICTURE))
  })
})
