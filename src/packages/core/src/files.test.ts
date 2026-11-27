import { describe, expect, it } from 'vitest'
import {
  detectCategory,
  isJpegFile,
  offersPngOutput,
  outputFileName,
  outputMimeType,
  textOutputFileName,
  textOutputMimeType,
} from './files'

describe('detectCategory', () => {
  it('detects by extension, ignoring case', () => {
    expect(detectCategory('IMG_1234.MOV')).toBe('video')
    expect(detectCategory('clip.mkv')).toBe('video')
    expect(detectCategory('funny.gif')).toBe('video')
    expect(detectCategory('IMG_5678.HEIC')).toBe('image')
    expect(detectCategory('scan.pdf')).toBe('pdf')
    expect(detectCategory('notes.txt')).toBe('text')
    expect(detectCategory('script.PY')).toBe('text')
    expect(detectCategory('feed.xml')).toBe('text')
    expect(detectCategory('vector.svg')).toBe('text')
  })

  it('falls back to the MIME type when there is no extension', () => {
    expect(detectCategory('', 'video/quicktime')).toBe('video')
    expect(detectCategory('shared', 'image/heic')).toBe('image')
    expect(detectCategory('document', 'application/pdf')).toBe('pdf')
    expect(detectCategory('payload', 'application/json')).toBe('text')
    expect(detectCategory('icon', 'image/svg+xml')).toBe('text')
    expect(detectCategory('readme', 'text/plain')).toBe('text')
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
    expect(outputFileName('script.py', 'text')).toBe('script-fit.py')
  })

  it('handles names without an extension', () => {
    expect(outputFileName('shared', 'video')).toBe('shared-fit.mp4')
    expect(outputFileName('', 'pdf')).toBe('file-fit.pdf')
  })

  it('saves photos as PNG or WebP when asked', () => {
    expect(outputFileName('logo.png', 'image', 'png')).toBe('logo-fit.png')
    expect(outputFileName('logo.png', 'image', 'webp')).toBe('logo-fit.webp')
    expect(outputMimeType('image', 'png')).toBe('image/png')
    expect(outputMimeType('image', 'webp')).toBe('image/webp')
    expect(outputMimeType('image')).toBe('image/jpeg')
    // The image format only applies to photos.
    expect(outputFileName('scan.pdf', 'pdf', 'png')).toBe('scan-fit.pdf')
  })

  it('names text outputs for minify or gzip', () => {
    expect(textOutputFileName('data.xml', 'minify')).toBe('data-fit.xml')
    expect(textOutputFileName('data.xml', 'gzip')).toBe('data.xml.gz')
    expect(textOutputMimeType('data.xml', 'gzip')).toBe('application/gzip')
    expect(textOutputMimeType('data.json', 'minify')).toBe('application/json;charset=utf-8')
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
