import { KB, MB, presetsFor } from '@revel/core'
import { describe, expect, it } from 'vitest'
import { defaultTarget, targetBytes, type Target } from './target'

const custom = (customValue: string, customUnit: Target['customUnit']): Target => ({
  choice: 'custom',
  customValue,
  customUnit,
})

describe('defaultTarget', () => {
  it('starts on the first preset, with KB for photos and MB for the rest', () => {
    expect(defaultTarget('video')).toEqual({ choice: 'discord', customValue: '', customUnit: 'MB' })
    expect(defaultTarget('image')).toEqual({ choice: 'portal-id', customValue: '', customUnit: 'KB' })
    expect(defaultTarget('pdf')).toEqual({ choice: 'visa-portal', customValue: '', customUnit: 'MB' })
  })
})

describe('targetBytes', () => {
  it("uses the chosen preset's limit", () => {
    for (const preset of presetsFor('pdf')) {
      expect(targetBytes({ ...defaultTarget('pdf'), choice: preset.id }, 'pdf')).toBe(preset.maxBytes)
    }
  })

  it('is null for a preset from another file type', () => {
    expect(targetBytes({ ...defaultTarget('video'), choice: 'discord' }, 'image')).toBeNull()
  })

  it('reads a custom size in decimal MB or KB', () => {
    expect(targetBytes(custom('8', 'MB'), 'video')).toBe(8 * MB)
    expect(targetBytes(custom('250', 'KB'), 'image')).toBe(250 * KB)
    expect(targetBytes(custom('1.5', 'MB'), 'pdf')).toBe(1_500_000)
  })

  it('rounds to whole bytes', () => {
    expect(targetBytes(custom('1.0006', 'KB'), 'pdf')).toBe(1001)
  })

  it('is null while the custom box is empty or invalid', () => {
    for (const value of ['', '   ', '0', '-5', 'abc', '1,5']) {
      expect(targetBytes(custom(value, 'MB'), 'video')).toBeNull()
    }
  })
})
