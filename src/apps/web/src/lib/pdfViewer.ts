export const MIN_PDF_ZOOM = 0.5
export const MAX_PDF_ZOOM = 3
export const PDF_ZOOM_STEP = 0.25
export const MAX_PDF_DPR = 2

export interface PdfPageLayout {
  cssScale: number
  cssWidth: number
  cssHeight: number
  renderScale: number
  canvasWidth: number
  canvasHeight: number
}

export function clampPdfZoom(zoom: number): number {
  const clamped = Math.min(MAX_PDF_ZOOM, Math.max(MIN_PDF_ZOOM, zoom))
  return Math.round(clamped * 100) / 100
}

export function computePdfPageLayout(
  pageWidth: number,
  pageHeight: number,
  containerWidth: number,
  zoom: number,
  devicePixelRatio: number,
): PdfPageLayout {
  const safePageWidth = Math.max(1, pageWidth)
  const safePageHeight = Math.max(1, pageHeight)
  const safeContainerWidth = Math.max(1, containerWidth)
  const fitScale = safeContainerWidth / safePageWidth
  const cssScale = fitScale * clampPdfZoom(zoom)
  const dpr = Math.min(Math.max(1, devicePixelRatio), MAX_PDF_DPR)
  const renderScale = cssScale * dpr

  return {
    cssScale,
    cssWidth: Math.max(1, Math.round(safePageWidth * cssScale)),
    cssHeight: Math.max(1, Math.round(safePageHeight * cssScale)),
    renderScale,
    canvasWidth: Math.max(1, Math.round(safePageWidth * renderScale)),
    canvasHeight: Math.max(1, Math.round(safePageHeight * renderScale)),
  }
}

export function isPdfMagicHeader(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  )
}

export function classifyPdfError(err: unknown): 'password' | 'invalid' {
  if (err && typeof err === 'object') {
    const name = 'name' in err && typeof err.name === 'string' ? err.name : ''
    const message = 'message' in err && typeof err.message === 'string' ? err.message : ''
    if (name === 'PasswordException' || /password/i.test(message)) {
      return 'password'
    }
  } else if (typeof err === 'string' && /password/i.test(err)) {
    return 'password'
  }
  return 'invalid'
}
