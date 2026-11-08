import { describe, expect, it } from 'vitest'
import { detectCategory, isJpegFile, offersPngOutput, outputFileName, outputMimeType } from './files'

describe('detectCategory', () => {
  it('detects by extension, ignoring case', () => {
    expect(detectCategory('IMG_1234.MOV')).toBe('video')
    expect(detectCategory('clip.mkv')).toBe('video')
    expect(detectCategory('funny.gif')).toBe('video')
    expect(detectCategory('IMG_5678.HEIC')).toBe('image')
    expect(detectCategory('scan.pdf')).toBe('pdf')
  })

  it('falls back to the MIME type when there is no extension', () => {
    expect(detectCategory('', 'video/quicktime')).toBe('video')
    expect(detectCategory('shared', 'image/heic')).toBe('image')
    expect(detectCategory('document', 'application/pdf')).toBe('pdf')
  })

  it('rejects unsupported files', () => {
    expect(detectCategory('notes.docx')).toBeNull()
    expect(detectCategory('archive.zip', 'application/zip')).toBeNull()
  })
})

describe('outputFileName', () => {
  it('swaps in the output extension and adds a -fit suffix', () => {
    expect(outputFileName('IMG_1234.MOV', 'video')).toBe('IMG_1234-fit.mp4')
    expect(outputFileName('photo.heic', 'image')).toBe('photo-fit.jpg')
    expect(outputFileName('my.visa.scan.pdf', 'pdf')).toBe('my.visa.scan-fit.pdf')
  })

  it('handles names without an extension', () => {
    expect(outputFileName('shared', 'video')).toBe('shared-fit.mp4')
    expect(outputFileName('', 'pdf')).toBe('file-fit.pdf')
  })

  it('saves photos as PNG when asked', () => {
    expect(outputFileName('logo.png', 'image', 'png')).toBe('logo-fit.png')
    expect(outputMimeType('image', 'png')).toBe('image/png')
    expect(outputMimeType('image')).toBe('image/jpeg')
    // The image format only applies to photos.
    expect(outputFileName('scan.pdf', 'pdf', 'png')).toBe('scan-fit.pdf')
  })
})

describe('offersPngOutput', () => {
  it('offers PNG only for sources that can be see-through', () => {
    expect(offersPngOutput('logo.PNG')).toBe(true)
    expect(offersPngOutput('sticker.webp')).toBe(true)
    expect(offersPngOutput('', 'image/png')).toBe(true)
    expect(offersPngOutput('IMG_1234.HEIC')).toBe(false)
    expect(offersPngOutput('photo.jpg')).toBe(false)
  })
})

describe('isJpegFile', () => {
  it('recognises both JPEG extensions and the MIME type', () => {
    expect(isJpegFile('photo.JPG')).toBe(true)
    expect(isJpegFile('photo.jpeg')).toBe(true)
    expect(isJpegFile('', 'image/jpeg')).toBe(true)
    expect(isJpegFile('photo.heic')).toBe(false)
  })
})
