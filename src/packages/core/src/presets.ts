export const KB = 1000
export const MB = 1000 * KB

export type FileCategory = 'video' | 'image' | 'pdf' | 'text'

export interface SizePreset {
  id: string
  label: string
  category: FileCategory
  maxBytes: number
}

export const PRESETS = [
  { id: 'discord', label: 'Discord', category: 'video', maxBytes: 10 * MB },
  { id: 'whatsapp', label: 'WhatsApp', category: 'video', maxBytes: 16 * MB },
  { id: 'email', label: 'Email', category: 'video', maxBytes: 25 * MB },
  { id: 'portal-id', label: 'ID Photo', category: 'image', maxBytes: 500 * KB },
  { id: 'standard-form', label: 'Form', category: 'image', maxBytes: 1 * MB },
  { id: 'visa-portal', label: 'Portal', category: 'pdf', maxBytes: 2 * MB },
  { id: 'standard-doc', label: 'Document', category: 'pdf', maxBytes: 5 * MB },
  { id: 'email-packet', label: 'Email', category: 'pdf', maxBytes: 10 * MB },
  { id: 'text-small', label: '100 KB', category: 'text', maxBytes: 100 * KB },
  { id: 'text-medium', label: '500 KB', category: 'text', maxBytes: 500 * KB },
  { id: 'text-large', label: '1 MB', category: 'text', maxBytes: 1 * MB },
] as const satisfies readonly SizePreset[]

export type PresetId = (typeof PRESETS)[number]['id']

export function presetsFor(category: FileCategory): SizePreset[] {
  return PRESETS.filter((preset) => preset.category === category)
}

export function formatBytes(bytes: number): string {
  if (bytes >= MB) return `${Number((bytes / MB).toFixed(1))} MB`
  if (bytes >= KB) return `${Math.round(bytes / KB)} KB`
  return `${bytes} B`
}
