import type { ImageFormat } from '@revel/core'
import { choiceClass } from './styles'

const FORMATS: { format: ImageFormat; label: string; detail: string }[] = [
  { format: 'jpeg', label: 'JPG', detail: 'Smallest file' },
  { format: 'png', label: 'PNG', detail: 'Keeps see-through areas' },
]

interface ImageFormatPickerProps {
  format: ImageFormat
  /** Null while the image is still being checked. */
  transparent: boolean | null
  onChange: (format: ImageFormat) => void
}

export function ImageFormatPicker({ format, transparent, onChange }: ImageFormatPickerProps) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">Save as</legend>
      <div className="grid grid-cols-2 gap-2">
        {FORMATS.map((option) => (
          <button
            key={option.format}
            type="button"
            aria-pressed={format === option.format}
            onClick={() => onChange(option.format)}
            className={choiceClass(format === option.format)}
          >
            <span className="block font-medium">{option.label}</span>
            <span className="block opacity-75">{option.detail}</span>
          </button>
        ))}
      </div>
      <p
        className={`mt-2 text-sm ${
          format === 'jpeg' && transparent
            ? 'text-amber-700 dark:text-amber-300'
            : 'text-slate-600 dark:text-slate-400'
        }`}
      >
        {format === 'png'
          ? 'PNG keeps every pixel, so the file is bigger. To fit, the image may be made smaller.'
          : transparent
            ? '⚠ This image has see-through areas. As a JPG they will turn white.'
            : 'JPG gives the smallest file and works everywhere.'}
      </p>
    </fieldset>
  )
}
