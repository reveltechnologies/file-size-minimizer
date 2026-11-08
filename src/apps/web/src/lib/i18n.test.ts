import { describe, expect, it } from 'vitest'
import { AVAILABLE_LOCALES, resolveLocaleCode, translate } from './i18n'

describe('i18n', () => {
  it('loads en_us and tr_tr locales automatically', () => {
    const codes = AVAILABLE_LOCALES.map((l) => l.code)
    expect(codes).toContain('en_us')
    expect(codes).toContain('tr_tr')
  })

  it('resolves phone language tags to supported locale codes', () => {
    expect(resolveLocaleCode(['tr-TR', 'en-US'])).toBe('tr_tr')
    expect(resolveLocaleCode(['tr'])).toBe('tr_tr')
    expect(resolveLocaleCode(['en-GB'])).toBe('en_us')
    expect(resolveLocaleCode(['unknown-XX'])).toBe('en_us')
  })

  it('translates keys and interpolates placeholders', () => {
    expect(translate('en_us', 'shrink.shrinkUnder', { size: '10 MB' })).toBe('Shrink < 10 MB')
    expect(translate('tr_tr', 'shrink.shrinkUnder', { size: '10 MB' })).toBe(
      '10 MB altına küçült',
    )
  })
})

