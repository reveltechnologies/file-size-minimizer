import { createContext, useContext } from 'react'
import enUsRaw from '../locales/en_us.json'

export interface LocaleMeta {
  code: string
  name: string
  nativeName: string
}

interface RawLocaleFile {
  _meta?: LocaleMeta
  [key: string]: string | LocaleMeta | undefined
}

export type TranslationKey = Exclude<keyof typeof enUsRaw, '_meta'>

const localeModules = import.meta.glob<{ default: RawLocaleFile }>('../locales/*.json', {
  eager: true,
})

const CATALOG: Record<string, Record<string, string>> = {}
export const AVAILABLE_LOCALES: LocaleMeta[] = []

for (const [path, mod] of Object.entries(localeModules)) {
  const data = mod.default ?? (mod as unknown as RawLocaleFile)
  const fileNameCode = path
    .split('/')
    .pop()
    ?.replace(/\.json$/i, '')
    .toLowerCase()
  const code = (data._meta?.code ?? fileNameCode ?? '').toLowerCase()
  if (!code) continue

  const strings: Record<string, string> = {}
  for (const [k, v] of Object.entries(data)) {
    if (k !== '_meta' && typeof v === 'string') {
      strings[k] = v
    }
  }
  CATALOG[code] = strings
  AVAILABLE_LOCALES.push({
    code,
    name: data._meta?.name ?? code,
    nativeName: data._meta?.nativeName ?? code,
  })
}

AVAILABLE_LOCALES.sort((a, b) => {
  if (a.code === 'en_us') return -1
  if (b.code === 'en_us') return 1
  return a.nativeName.localeCompare(b.nativeName)
})

export const DEFAULT_LOCALE = 'en_us'

/**
 * Matches a browser/phone language tag (e.g. "tr-TR", "tr", "en-GB")
 * against available locale files, falling back to `en_us`.
 */
export function resolveLocaleCode(candidates: readonly string[]): string {
  for (const raw of candidates) {
    if (!raw) continue
    const normalized = raw.trim().toLowerCase().replace('-', '_')
    if (CATALOG[normalized]) return normalized

    const primary = normalized.split('_')[0]
    const prefixMatch = AVAILABLE_LOCALES.find(
      (loc) => loc.code === primary || loc.code.startsWith(`${primary}_`),
    )
    if (prefixMatch) return prefixMatch.code
  }
  return DEFAULT_LOCALE
}

export function detectDeviceLanguage(): string {
  if (typeof navigator === 'undefined') return DEFAULT_LOCALE
  const list =
    Array.isArray(navigator.languages) && navigator.languages.length > 0
      ? navigator.languages
      : [navigator.language]
  return resolveLocaleCode(list)
}

export function translate(
  locale: string,
  key: TranslationKey,
  vars?: Record<string, string | number>,
): string {
  const dict = CATALOG[locale] ?? CATALOG[DEFAULT_LOCALE] ?? {}
  const fallback = CATALOG[DEFAULT_LOCALE] ?? {}
  let template = dict[key] ?? fallback[key] ?? key

  if (vars) {
    for (const [k, val] of Object.entries(vars)) {
      template = template.replaceAll(`{${k}}`, String(val))
    }
  }
  return template
}

export interface I18nContextValue {
  locale: string
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string
}

export const I18nContext = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  t: (key, vars) => translate(DEFAULT_LOCALE, key, vars),
})

export function useI18n(): I18nContextValue {
  return useContext(I18nContext)
}

