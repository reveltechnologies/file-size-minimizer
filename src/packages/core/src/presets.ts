/**
 * Sizes use decimal units (1 MB = 1,000,000 bytes). That is the stricter
 * reading of any upload limit, so a file that fits here fits everywhere.
 */
export const KB = 1000
export const MB = 1000 * KB

export type FileCategory = 'video' | 'image' | 'pdf'

export interface SizePreset {
  id: string
  label: string
  category: FileCategory
  maxBytes: number
}

export const PRESETS = [
  { id: 'discord', label: 'Discord Free', category: 'video', maxBytes: 10 * MB },
  { id: 'whatsapp', label: 'WhatsApp', category: 'video', maxBytes: 16 * MB },
  { id: 'email', label: 'Email / Gmail', category: 'video', maxBytes: 25 * MB },
  { id: 'portal-id', label: 'Strict Portal ID', category: 'image', maxBytes: 500 * KB },
  { id: 'standard-form', label: 'Standard Form', category: 'image', maxBytes: 1 * MB },
  { id: 'visa-portal', label: 'Visa / Uni Portal', category: 'pdf', maxBytes: 2 * MB },
  { id: 'standard-doc', label: 'Standard Doc', category: 'pdf', maxBytes: 5 * MB },
  { id: 'email-packet', label: 'Email Packet', category: 'pdf', maxBytes: 10 * MB },
] as const satisfies readonly SizePreset[]

export type PresetId = (typeof PRESETS)[number]['id']

export function presetsFor(category: FileCategory): SizePreset[] {
  return PRESETS.filter((preset) => preset.category === category)
}

/** Human-readable size, e.g. 9_400_000 → "9.4 MB", 480_000 → "480 KB". */
export function formatBytes(bytes: number): string {
  if (bytes >= MB) return `${Number((bytes / MB).toFixed(1))} MB`
  if (bytes >= KB) return `${Math.round(bytes / KB)} KB`
  return `${bytes} B`
}
