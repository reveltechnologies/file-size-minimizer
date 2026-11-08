import { KB, MB, presetsFor, type FileCategory } from '@revel/core'

export type SizeUnit = 'KB' | 'MB'

export interface Target {
  /** A preset id, or 'custom'. */
  choice: string
  customValue: string
  customUnit: SizeUnit
}

export function defaultTarget(category: FileCategory): Target {
  return {
    choice: presetsFor(category)[0].id,
    customValue: '',
    customUnit: category === 'image' ? 'KB' : 'MB',
  }
}

/** Null while the custom box is empty or invalid. */
export function targetBytes(target: Target, category: FileCategory): number | null {
  if (target.choice !== 'custom') {
    return presetsFor(category).find((p) => p.id === target.choice)?.maxBytes ?? null
  }
  const value = Number(target.customValue)
  return value > 0 ? Math.round(value * (target.customUnit === 'MB' ? MB : KB)) : null
}
