import { DEFAULT_OPTIONS, type CompressOptions, type ImageFormat } from '@revel/core'
import { AVAILABLE_LOCALES, detectDeviceLanguage, type TranslationKey } from './i18n'

export type ThemeId = 'dark-green' | 'dark-slate' | 'oled' | 'light-green' | 'light'
export type DefaultPhotoFormat = 'auto' | ImageFormat
export type OutputLocationMode = 'same' | 'ask' | 'fixed'

export interface AppSettings {
  language: string
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

export function createDefaultSettings(): AppSettings {
  return {
    language: detectDeviceLanguage(),
    theme: 'dark-green',
    options: { ...DEFAULT_OPTIONS },
    defaultPhotoFormat: 'auto',
    rememberHistory: true,
    outputLocationMode: 'same',
    fixedFolderName: 'Downloads',
    filePrefix: '',
    fileSuffix: '-fit',
  }
}

export const THEMES: {
  id: ThemeId
  labelKey: TranslationKey
  isDark: boolean
  swatch: string
}[] = [
  { id: 'dark-green', labelKey: 'settings.theme.dark-green', isDark: true, swatch: '#064e3b' },
  { id: 'oled', labelKey: 'settings.theme.oled', isDark: true, swatch: '#000000' },
  { id: 'dark-slate', labelKey: 'settings.theme.dark-slate', isDark: true, swatch: '#0f172a' },
  { id: 'light-green', labelKey: 'settings.theme.light-green', isDark: false, swatch: '#d1fae5' },
  { id: 'light', labelKey: 'settings.theme.light', isDark: false, swatch: '#f8fafc' },
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
  const defaults = createDefaultSettings()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaults
    const parsed = JSON.parse(raw) as Partial<AppSettings>
    const validLanguage =
      typeof parsed.language === 'string' &&
      AVAILABLE_LOCALES.some((l) => l.code === parsed.language)
        ? parsed.language
        : defaults.language
    const validTheme = THEMES.some((t) => t.id === parsed.theme)
      ? (parsed.theme as ThemeId)
      : defaults.theme
    const validPhotoFormat: DefaultPhotoFormat =
      parsed.defaultPhotoFormat === 'jpeg' ||
      parsed.defaultPhotoFormat === 'png' ||
      parsed.defaultPhotoFormat === 'auto'
        ? parsed.defaultPhotoFormat
        : defaults.defaultPhotoFormat
    const validLocationMode: OutputLocationMode =
      parsed.outputLocationMode === 'ask' ||
      parsed.outputLocationMode === 'fixed' ||
      parsed.outputLocationMode === 'same'
        ? parsed.outputLocationMode
        : defaults.outputLocationMode

    return {
      language: validLanguage,
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
          : defaults.rememberHistory,
      outputLocationMode: validLocationMode,
      fixedFolderName:
        typeof parsed.fixedFolderName === 'string' && parsed.fixedFolderName.trim()
          ? parsed.fixedFolderName
          : defaults.fixedFolderName,
      filePrefix:
        typeof parsed.filePrefix === 'string' ? parsed.filePrefix : defaults.filePrefix,
      fileSuffix:
        typeof parsed.fileSuffix === 'string' ? parsed.fileSuffix : defaults.fileSuffix,
    }
  } catch {
    return defaults
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Ignore storage quota errors in restricted webviews.
  }
}
