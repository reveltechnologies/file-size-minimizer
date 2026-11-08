/** A4 in PDF points (1/72 inch). */
export const A4_WIDTH = 595.28
export const A4_HEIGHT = 841.89
export const MAX_MERGE_PHOTOS = 30

export interface PagePlacement {
  pageWidth: number
  pageHeight: number
  x: number
  y: number
  width: number
  height: number
}

/** An A4 page (landscape for wide photos) with the photo scaled to fit and centered. */
export function placeOnA4(imageWidth: number, imageHeight: number): PagePlacement {
  const landscape = imageWidth > imageHeight
  const pageWidth = landscape ? A4_HEIGHT : A4_WIDTH
  const pageHeight = landscape ? A4_WIDTH : A4_HEIGHT
  const scale = Math.min(pageWidth / imageWidth, pageHeight / imageHeight)
  const width = imageWidth * scale
  const height = imageHeight * scale

  return { pageWidth, pageHeight, x: (pageWidth - width) / 2, y: (pageHeight - height) / 2, width, height }
}

/** Page order for combined photos: "IMG_2" before "IMG_10", like a file manager. */
export function compareFileNames(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
}
