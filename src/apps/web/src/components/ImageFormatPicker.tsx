import type { ImageFormat } from '@revel/core'
import { useI18n } from '../lib/i18n'
import { choiceClass } from './styles'

interface ImageFormatPickerProps {
  format: ImageFormat
  transparent: boolean | null
  onChange: (format: ImageFormat) => void
}

export function ImageFormatPicker({ format, transparent, onChange }: ImageFormatPickerProps) {
  const { t } = useI18n()
  const formats: { format: ImageFormat; label: string; detail: string }[] = [
    { format: 'jpeg', label: 'JPG', detail: t('format.smaller') },
    { format: 'png', label: 'PNG', detail: t('format.transparent') },
  ]

  return (
    <fieldset>
      <legend className="mb-2 text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
        {t('format.title')}
      </legend>
      <div className="grid grid-cols-2 gap-2">
        {formats.map((option) => (
          <button
            key={option.format}
            type="button"
            aria-pressed={format === option.format}
            onClick={() => onChange(option.format)}
            className={choiceClass(format === option.format)}
          >
            <span className="block font-semibold">{option.label}</span>
            <span className="block text-xs opacity-80">{option.detail}</span>
          </button>
        ))}
      </div>
      {format === 'jpeg' && transparent && (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
          {t('format.transparentWarning')}
        </p>
      )}
    </fieldset>
  )
}
