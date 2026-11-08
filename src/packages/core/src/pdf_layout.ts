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

export function placeOnA4(imageWidth: number, imageHeight: number): PagePlacement {
  const landscape = imageWidth > imageHeight
  const pageWidth = landscape ? A4_HEIGHT : A4_WIDTH
  const pageHeight = landscape ? A4_WIDTH : A4_HEIGHT
  const scale = Math.min(pageWidth / imageWidth, pageHeight / imageHeight)
  const width = imageWidth * scale
  const height = imageHeight * scale

  return { pageWidth, pageHeight, x: (pageWidth - width) / 2, y: (pageHeight - height) / 2, width, height }
}

export function compareFileNames(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
}
