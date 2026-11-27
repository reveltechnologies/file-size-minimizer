import { describe, expect, it } from 'vitest'
import {
  clampPdfZoom,
  classifyPdfError,
  computePdfPageLayout,
  isPdfMagicHeader,
  MAX_PDF_ZOOM,
  MIN_PDF_ZOOM,
} from './pdfViewer'

describe('pdfViewer helpers', () => {
  it('clamps zoom within supported bounds and rounds to 2 decimals', () => {
    expect(clampPdfZoom(0.1)).toBe(MIN_PDF_ZOOM)
    expect(clampPdfZoom(10)).toBe(MAX_PDF_ZOOM)
    expect(clampPdfZoom(1.125)).toBe(1.13)
    expect(clampPdfZoom(1.5)).toBe(1.5)
  })

  it('computes page layout scaled to container width and capped DPR', () => {
    const layout = computePdfPageLayout(600, 800, 300, 1, 3)
    expect(layout.cssScale).toBeCloseTo(0.5)
    expect(layout.cssWidth).toBe(300)
    expect(layout.cssHeight).toBe(400)
    expect(layout.renderScale).toBeCloseTo(1)
    expect(layout.canvasWidth).toBe(600)
    expect(layout.canvasHeight).toBe(800)

    const zoomed = computePdfPageLayout(600, 800, 300, 2, 1)
    expect(zoomed.cssWidth).toBe(600)
    expect(zoomed.cssHeight).toBe(800)
    expect(zoomed.canvasWidth).toBe(600)
    expect(zoomed.canvasHeight).toBe(800)
  })

  it('detects %PDF- magic header bytes', () => {
    expect(isPdfMagicHeader(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]))).toBe(true)
    expect(isPdfMagicHeader(new Uint8Array([0x25, 0x50, 0x44, 0x46]))).toBe(false)
    expect(isPdfMagicHeader(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d]))).toBe(false)
  })

  it('classifies password and invalid PDF errors', () => {
    const pwdErr = new Error('Need a password')
    pwdErr.name = 'PasswordException'
    expect(classifyPdfError(pwdErr)).toBe('password')
    expect(classifyPdfError(new Error('Incorrect Password'))).toBe('password')
    expect(classifyPdfError('Missing password')).toBe('password')
    expect(classifyPdfError(new Error('Invalid PDF structure'))).toBe('invalid')
    expect(classifyPdfError(null)).toBe('invalid')
  })
})
