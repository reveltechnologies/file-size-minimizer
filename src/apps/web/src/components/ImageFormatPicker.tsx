import type { ImageFormat } from '@revel/core'
import { useI18n } from '../lib/i18n'
import { segmentClass } from './styles'

interface ImageFormatPickerProps {
  format: ImageFormat
  transparent: boolean | null
  onChange: (format: ImageFormat) => void
}

const FORMATS: { format: ImageFormat; label: string }[] = [
  { format: 'jpeg', label: 'JPG' },
  { format: 'webp', label: 'WebP' },
  { format: 'png', label: 'PNG' },
]

export function ImageFormatPicker({ format, transparent, onChange }: ImageFormatPickerProps) {
  const { t } = useI18n()

  return (
    <div className="flex flex-col gap-1.5 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-[var(--app-text)]">{t('format.title')}</span>
        <div className="grid grid-cols-3 gap-0.5 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-0.5">
          {FORMATS.map((option) => {
            const active = format === option.format
            return (
              <button
                key={option.format}
                type="button"
                aria-pressed={active}
                onClick={() => onChange(option.format)}
                className={`${segmentClass(active)} cursor-pointer px-3 py-1 text-xs`}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>
      {format === 'jpeg' && transparent && (
        <p className="text-xs text-[var(--app-warn)]">{t('format.transparentWarning')}</p>
      )}
    </div>
  )
}
