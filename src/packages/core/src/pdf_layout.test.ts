import { describe, expect, it } from 'vitest'
import { A4_HEIGHT, A4_WIDTH, compareFileNames, placeOnA4 } from './pdf_layout'

describe('placeOnA4', () => {
  it('fills a portrait page with a portrait scan of the same shape', () => {
    const placement = placeOnA4(1240, 1754)

    expect(placement.pageWidth).toBe(A4_WIDTH)
    expect(placement.pageHeight).toBe(A4_HEIGHT)
    expect(placement.x).toBeCloseTo(0, 0)
    expect(placement.width).toBeCloseTo(A4_WIDTH, 0)
  })

  it('turns the page landscape for wide photos and centers them', () => {
    const placement = placeOnA4(4000, 3000)

    expect(placement.pageWidth).toBe(A4_HEIGHT)
    expect(placement.pageHeight).toBe(A4_WIDTH)
    expect(placement.height).toBeCloseTo(A4_WIDTH)
    expect(placement.x).toBeCloseTo((A4_HEIGHT - placement.width) / 2)
    expect(placement.y).toBeCloseTo(0)
  })
})

describe('compareFileNames', () => {
  it('sorts numbers naturally and ignores case', () => {
    const names = ['IMG_10.jpg', 'img_2.jpg', 'IMG_1.HEIC', 'page b.png', 'Page A.png']

    expect(names.sort(compareFileNames)).toEqual(['IMG_1.HEIC', 'img_2.jpg', 'IMG_10.jpg', 'Page A.png', 'page b.png'])
  })
})
