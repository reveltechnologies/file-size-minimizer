import { DEFAULT_OPTIONS, type CompressOptions, type ImageFormat } from '@revel/core'

export type ThemeId = 'dark-green' | 'dark-slate' | 'oled' | 'light-green' | 'light'
export type DefaultPhotoFormat = 'auto' | ImageFormat

export interface AppSettings {
  theme: ThemeId
  options: CompressOptions
  defaultPhotoFormat: DefaultPhotoFormat
  rememberHistory: boolean
}

const STORAGE_KEY = 'fsm.settings.v1'

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark-green',
  options: DEFAULT_OPTIONS,
  defaultPhotoFormat: 'auto',
  rememberHistory: true,
}

export const THEMES: {
  id: ThemeId
  label: string
  detail: string
  isDark: boolean
  swatch: string
}[] = [
  {
    id: 'dark-green',
    label: 'Dark Green',
    detail: 'Default forest dark',
    isDark: true,
    swatch: '#064e3b',
  },
  {
    id: 'oled',
    label: 'OLED Black',
    detail: 'Pure black + emerald',
    isDark: true,
    swatch: '#000000',
  },
  {
    id: 'dark-slate',
    label: 'Dark Slate',
    detail: 'Deep slate night',
    isDark: true,
    swatch: '#0f172a',
  },
  {
    id: 'light-green',
    label: 'Mint Light',
    detail: 'Soft green daylight',
    isDark: false,
    swatch: '#d1fae5',
  },
  {
    id: 'light',
    label: 'Classic Light',
    detail: 'Clean white daylight',
    isDark: false,
    swatch: '#f8fafc',
  },
]

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<AppSettings>
    const validTheme = THEMES.some((t) => t.id === parsed.theme)
      ? (parsed.theme as ThemeId)
      : DEFAULT_SETTINGS.theme
    const validPhotoFormat: DefaultPhotoFormat =
      parsed.defaultPhotoFormat === 'jpeg' ||
      parsed.defaultPhotoFormat === 'png' ||
      parsed.defaultPhotoFormat === 'auto'
        ? parsed.defaultPhotoFormat
        : DEFAULT_SETTINGS.defaultPhotoFormat
    return {
      theme: validTheme,
      options: {
        stripHiddenData:
          typeof parsed.options?.stripHiddenData === 'boolean'
            ? parsed.options.stripHiddenData
            : DEFAULT_OPTIONS.stripHiddenData,
        smartOptimize:
          typeof parsed.options?.smartOptimize === 'boolean'
            ? parsed.options.smartOptimize
            : DEFAULT_OPTIONS.smartOptimize,
        muteAudio:
          typeof parsed.options?.muteAudio === 'boolean'
            ? parsed.options.muteAudio
            : DEFAULT_OPTIONS.muteAudio,
      },
      defaultPhotoFormat: validPhotoFormat,
      rememberHistory:
        typeof parsed.rememberHistory === 'boolean'
          ? parsed.rememberHistory
          : DEFAULT_SETTINGS.rememberHistory,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Ignore storage quota errors in restricted webviews.
  }
}

