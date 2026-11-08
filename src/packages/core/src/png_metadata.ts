/**
 * Lossless PNG metadata surgery: drops whole chunks and never touches the
 * compressed picture data, so no checksums need recomputing.
 */

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
/** Optional chunks that change how the picture looks; every other optional one is dropped. */
const RENDERING_CHUNKS = new Set([
  'tRNS', // transparency
  'cHRM', 'gAMA', 'iCCP', 'sRGB', 'cICP', 'mDCV', 'cLLI', 'sBIT', // colour
  'bKGD', 'pHYs', // background colour, print size
  'acTL', 'fcTL', 'fdAT', // animation
])
/** IHDR colour types with an alpha channel: grey + alpha, RGB + alpha. */
const ALPHA_COLOR_TYPES = new Set([4, 6])

interface Chunk {
  type: string
  start: number
  end: number
}

export function isPng(bytes: Uint8Array): boolean {
  return SIGNATURE.every((byte, i) => bytes[i] === byte)
}

/** Removes text (author, software, comments), EXIF/GPS, timestamps and app data. Null if unreadable. */
export function stripPngMetadata(png: Uint8Array): Uint8Array<ArrayBuffer> | null {
  const chunks = readChunks(png)
  if (!chunks) return null
  const kept = chunks.filter((chunk) => isCritical(chunk.type) || RENDERING_CHUNKS.has(chunk.type))
  const result = new Uint8Array(SIGNATURE.length + kept.reduce((sum, c) => sum + c.end - c.start, 0))
  result.set(SIGNATURE)
  let offset = SIGNATURE.length
  for (const chunk of kept) {
    result.set(png.subarray(chunk.start, chunk.end), offset)
    offset += chunk.end - chunk.start
  }
  return result
}

/**
 * Whether the header allows see-through pixels (an alpha channel or a tRNS
 * chunk). Many such PNGs are fully opaque anyway, so true only means "maybe".
 * Null if the file isn't a readable PNG.
 */
export function pngMayHaveTransparency(png: Uint8Array): boolean | null {
  const chunks = readChunks(png)
  if (!chunks || chunks[0]?.type !== 'IHDR') return null
  const colorType = png[chunks[0].start + 8 + 9] // chunk header (8) + width, height, bit depth (9)
  return ALPHA_COLOR_TYPES.has(colorType) || chunks.some((chunk) => chunk.type === 'tRNS')
}

function readChunks(png: Uint8Array): Chunk[] | null {
  if (!isPng(png)) return null
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength)
  const chunks: Chunk[] = []
  let offset = SIGNATURE.length
  while (offset + 12 <= png.length) {
    const type = String.fromCharCode(...png.subarray(offset + 4, offset + 8))
    const end = offset + 12 + view.getUint32(offset) // length, type, data, CRC
    if (end > png.length) return null
    chunks.push({ type, start: offset, end })
    if (type === 'IEND') return chunks
    offset = end
  }
  return null
}

/** Critical chunks start with a capital letter and must always be kept. */
function isCritical(type: string): boolean {
  return type[0] >= 'A' && type[0] <= 'Z'
}
