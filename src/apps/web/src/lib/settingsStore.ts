import { DEFAULT_OPTIONS, type CompressOptions, type ImageFormat } from '@revel/core'

export type ThemeId = 'dark-green' | 'dark-slate' | 'oled' | 'light-green' | 'light'
export type DefaultPhotoFormat = 'auto' | ImageFormat
export type OutputLocationMode = 'same' | 'ask' | 'fixed'

export interface AppSettings {
  theme: ThemeId
  options: CompressOptions
  defaultPhotoFormat: DefaultPhotoFormat
  rememberHistory: boolean
  outputLocationMode: OutputLocationMode
  fixedFolderName: string
  filePrefix: string
  fileSuffix: string
}

const STORAGE_KEY = 'fsm.settings.v1'

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark-green',
  options: DEFAULT_OPTIONS,
  defaultPhotoFormat: 'auto',
  rememberHistory: true,
  outputLocationMode: 'same',
  fixedFolderName: 'Downloads',
  filePrefix: '',
  fileSuffix: '-fit',
}

export const THEMES: {
  id: ThemeId
  label: string
  isDark: boolean
  swatch: string
}[] = [
  { id: 'dark-green', label: 'Dark Green', isDark: true, swatch: '#064e3b' },
  { id: 'oled', label: 'OLED Black', isDark: true, swatch: '#000000' },
  { id: 'dark-slate', label: 'Dark Slate', isDark: true, swatch: '#0f172a' },
  { id: 'light-green', label: 'Mint Light', isDark: false, swatch: '#d1fae5' },
  { id: 'light', label: 'Light', isDark: false, swatch: '#f8fafc' },
]

export function applyNaming(
  inputFileName: string,
  engineOutputName: string,
  prefix: string,
  suffix: string,
): string {
  const outDot = engineOutputName.lastIndexOf('.')
  const ext = outDot > 0 ? engineOutputName.slice(outDot + 1) : 'bin'
  const inDot = inputFileName.lastIndexOf('.')
  const base = inDot > 0 ? inputFileName.slice(0, inDot) : inputFileName || 'file'
  const cleanPrefix = prefix.replace(/[\\/:*?"<>|]/g, '')
  const cleanSuffix = suffix.replace(/[\\/:*?"<>|]/g, '')
  return `${cleanPrefix}${base}${cleanSuffix}.${ext}`
}

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
    const validLocationMode: OutputLocationMode =
      parsed.outputLocationMode === 'ask' ||
      parsed.outputLocationMode === 'fixed' ||
      parsed.outputLocationMode === 'same'
        ? parsed.outputLocationMode
        : DEFAULT_SETTINGS.outputLocationMode

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
      outputLocationMode: validLocationMode,
      fixedFolderName:
        typeof parsed.fixedFolderName === 'string' && parsed.fixedFolderName.trim()
          ? parsed.fixedFolderName
          : DEFAULT_SETTINGS.fixedFolderName,
      filePrefix:
        typeof parsed.filePrefix === 'string' ? parsed.filePrefix : DEFAULT_SETTINGS.filePrefix,
      fileSuffix:
        typeof parsed.fileSuffix === 'string' ? parsed.fileSuffix : DEFAULT_SETTINGS.fileSuffix,
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
