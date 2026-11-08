import { MAX_MERGE_PHOTOS } from '@revel/core'
import { describe, expect, it } from 'vitest'
import { pickFiles } from './pickFiles'

const file = (name: string, size = 1000, type = '') => new File([new Uint8Array(size)], name, { type })

describe('pickFiles', () => {
  it('accepts one supported file and reports its category', () => {
    for (const [name, category] of [
      ['IMG_1234.MOV', 'video'],
      ['logo.png', 'image'],
      ['visa.pdf', 'pdf'],
    ]) {
      const picked = file(name)
      expect(pickFiles([picked])).toEqual({ files: [picked], category })
    }
  })

  it('rejects an empty file before anything else', () => {
    expect(pickFiles([file('scan.pdf', 0)])).toBe('"scan.pdf" is empty.')
    expect(pickFiles([file('a.jpg'), file('b.jpg', 0)])).toBe('"b.jpg" is empty.')
  })

  it('rejects an unsupported file', () => {
    expect(pickFiles([file('notes.docx')])).toBe(`"notes.docx" isn't supported. Try a video, photo or PDF.`)
  })

  it('combines several photos into one PDF, in natural name order', () => {
    const picked = pickFiles([file('IMG_10.jpg'), file('img_2.HEIC'), file('IMG_1.png')])

    expect(picked).toMatchObject({ category: 'pdf' })
    expect(typeof picked !== 'string' && picked.files.map((f) => f.name)).toEqual(['IMG_1.png', 'img_2.HEIC', 'IMG_10.jpg'])
  })

  it('refuses to combine anything that is not a photo', () => {
    expect(pickFiles([file('a.jpg'), file('form.pdf')])).toBe(
      `To combine files into one PDF, pick only photos. "form.pdf" isn't a photo.`,
    )
    expect(pickFiles([file('a.jpg'), file('clip.mp4')])).toMatch(/"clip\.mp4" isn't a photo/)
  })

  it(`allows up to ${MAX_MERGE_PHOTOS} photos at a time`, () => {
    const photos = (count: number) => Array.from({ length: count }, (_, i) => file(`${i}.jpg`))

    expect(pickFiles(photos(MAX_MERGE_PHOTOS))).toMatchObject({ category: 'pdf' })
    expect(pickFiles(photos(MAX_MERGE_PHOTOS + 1))).toBe(`Pick up to ${MAX_MERGE_PHOTOS} photos at a time.`)
  })
})
