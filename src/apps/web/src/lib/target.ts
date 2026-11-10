import { KB, MB, presetsFor, type FileCategory } from '@revel/core'

export type SizeUnit = 'KB' | 'MB'

export interface Target {
  choice: string
  customValue: string
  customUnit: SizeUnit
}

export function defaultTarget(category: FileCategory, sourceBytes?: number): Target {
  const presets = presetsFor(category)
  if (sourceBytes && sourceBytes > 0) {
    const fittingPreset = presets.find((p) => p.maxBytes < sourceBytes)
    if (fittingPreset) {
      return {
        choice: fittingPreset.id,
        customValue: '',
        customUnit: category === 'image' || sourceBytes < 1000 * 1000 ? 'KB' : 'MB',
      }
    }
    const halfBytes = Math.max(10 * KB, Math.floor(sourceBytes * 0.5))
    if (halfBytes < 1000 * 1000) {
      return {
        choice: 'custom',
        customValue: String(Math.round(halfBytes / KB)),
        customUnit: 'KB',
      }
    }
    return {
      choice: 'custom',
      customValue: String(Number((halfBytes / MB).toFixed(1))),
      customUnit: 'MB',
    }
  }

  return {
    choice: presets[0].id,
    customValue: '',
    customUnit: category === 'image' ? 'KB' : 'MB',
  }
}

export function targetBytes(target: Target, category: FileCategory): number | null {
  if (target.choice !== 'custom') {
    return presetsFor(category).find((p) => p.id === target.choice)?.maxBytes ?? null
  }
  const value = Number(target.customValue)
  return value > 0 ? Math.round(value * (target.customUnit === 'MB' ? MB : KB)) : null
}
