import { describe, expect, it } from 'vitest'
import { formatBytes, PRESETS, presetsFor } from './presets'

describe('presets', () => {
  it('has unique ids', () => {
    const ids = PRESETS.map((preset) => preset.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('groups presets by category', () => {
    expect(presetsFor('video').map((p) => p.id)).toEqual(['discord', 'whatsapp', 'email'])
    expect(presetsFor('image').map((p) => p.id)).toEqual(['portal-id', 'standard-form'])
    expect(presetsFor('pdf').map((p) => p.id)).toEqual(['visa-portal', 'standard-doc', 'email-packet'])
  })
})

describe('formatBytes', () => {
  it('formats MB, KB and bytes', () => {
    expect(formatBytes(64_000_000)).toBe('64 MB')
    expect(formatBytes(9_400_000)).toBe('9.4 MB')
    expect(formatBytes(480_000)).toBe('480 KB')
    expect(formatBytes(512)).toBe('512 B')
  })
})
