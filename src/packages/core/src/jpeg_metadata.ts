const SOI = 0xd8
const SOS = 0xda
const EOI = 0xd9
const APP1 = 0xe1
const PRIVATE_MARKERS = new Set([APP1, 0xed, 0xfe])
const EXIF_SIGNATURE = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00]
const ORIENTATION_TAG = 0x0112

interface Segment {
  marker: number
  start: number
  end: number
}

interface Header {
  segments: Segment[]
  bodyStart: number
}

export function isJpeg(bytes: Uint8Array): boolean {
  return bytes[0] === 0xff && bytes[1] === SOI
}

export function stripJpegMetadata(jpeg: Uint8Array): Uint8Array<ArrayBuffer> | null {
  const header = readHeader(jpeg)
  if (!header) return null
  const kept = header.segments.filter((s) => !PRIVATE_MARKERS.has(s.marker))
  return concat([
    jpeg.subarray(0, 2),
    ...kept.map((s) => jpeg.subarray(s.start, s.end)),
    jpeg.subarray(header.bodyStart),
  ])
}

export function extractExif(jpeg: Uint8Array): Uint8Array<ArrayBuffer> | null {
  const segment = readHeader(jpeg)?.segments.find((s) => isExifSegment(jpeg, s))
  return segment ? jpeg.slice(segment.start, segment.end) : null
}

export function insertExif(jpeg: Uint8Array, exif: Uint8Array): Uint8Array<ArrayBuffer> {
  const copy = exif.slice()
  resetOrientation(copy)
  return concat([jpeg.subarray(0, 2), copy, jpeg.subarray(2)])
}

function readHeader(jpeg: Uint8Array): Header | null {
  if (!isJpeg(jpeg)) return null
  const segments: Segment[] = []
  let offset = 2
  while (offset + 4 <= jpeg.length && jpeg[offset] === 0xff) {
    const marker = jpeg[offset + 1]
    if (marker === SOS || marker === EOI) return { segments, bodyStart: offset }
    const end = offset + 2 + ((jpeg[offset + 2] << 8) | jpeg[offset + 3])
    if (end > jpeg.length) return null
    segments.push({ marker, start: offset, end })
    offset = end
  }
  return null
}

function isExifSegment(jpeg: Uint8Array, segment: Segment): boolean {
  return segment.marker === APP1 && EXIF_SIGNATURE.every((byte, i) => jpeg[segment.start + 4 + i] === byte)
}

function resetOrientation(exif: Uint8Array): void {
  const view = new DataView(exif.buffer, exif.byteOffset, exif.byteLength)
  const tiff = 10
  if (tiff + 8 > exif.length) return
  const littleEndian = view.getUint16(tiff) === 0x4949
  const ifd0 = tiff + view.getUint32(tiff + 4, littleEndian)
  if (ifd0 + 2 > exif.length) return

  const count = view.getUint16(ifd0, littleEndian)
  for (let i = 0; i < count; i++) {
    const entry = ifd0 + 2 + i * 12
    if (entry + 12 > exif.length) return
    if (view.getUint16(entry, littleEndian) === ORIENTATION_TAG) {
      view.setUint16(entry + 8, 1, littleEndian)
      return
    }
  }
}

function concat(parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const result = new Uint8Array(parts.reduce((sum, p) => sum + p.length, 0))
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }
  return result
}
