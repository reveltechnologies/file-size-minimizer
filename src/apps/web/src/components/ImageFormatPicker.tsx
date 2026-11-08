import type { ImageFormat } from '@revel/core'
import { choiceClass } from './styles'

const FORMATS: { format: ImageFormat; label: string; detail: string }[] = [
  { format: 'jpeg', label: 'JPG', detail: 'Smaller' },
  { format: 'png', label: 'PNG', detail: 'Transparent' },
]

interface ImageFormatPickerProps {
  format: ImageFormat
  transparent: boolean | null
  onChange: (format: ImageFormat) => void
}

export function ImageFormatPicker({ format, transparent, onChange }: ImageFormatPickerProps) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
        Format
      </legend>
      <div className="grid grid-cols-2 gap-2">
        {FORMATS.map((option) => (
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
          Transparent areas become white in JPG.
        </p>
      )}
    </fieldset>
  )
}
