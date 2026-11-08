import { formatBytes, presetsFor, type FileCategory } from '@revel/core'
import type { SizeUnit, Target } from '../lib/target'
import { choiceClass } from './styles'

interface TargetPickerProps {
  category: FileCategory
  target: Target
  onChange: (target: Target) => void
}

export function TargetPicker({ category, target, onChange }: TargetPickerProps) {
  const isCustom = target.choice === 'custom'

  return (
    <fieldset>
      <legend className="mb-2 text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
        Fit under
      </legend>
      <div className="grid grid-cols-2 gap-2">
        {presetsFor(category).map((preset) => (
          <button
            key={preset.id}
            type="button"
            aria-pressed={target.choice === preset.id}
            onClick={() => onChange({ ...target, choice: preset.id })}
            className={choiceClass(target.choice === preset.id)}
          >
            <span className="block truncate font-semibold">{preset.label}</span>
            <span className="block text-xs opacity-80">&lt; {formatBytes(preset.maxBytes)}</span>
          </button>
        ))}
        <button
          type="button"
          aria-pressed={isCustom}
          onClick={() => onChange({ ...target, choice: 'custom' })}
          className={choiceClass(isCustom)}
        >
          <span className="block font-semibold">Custom</span>
          <span className="block text-xs opacity-80">Your limit</span>
        </button>
      </div>

      {isCustom && (
        <div className="mt-2.5 flex gap-2">
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            placeholder="e.g. 8"
            aria-label="Custom size limit"
            autoFocus
            value={target.customValue}
            onChange={(event) => onChange({ ...target, customValue: event.target.value })}
            className="min-w-0 flex-1 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3.5 py-2.5 text-base"
          />
          <select
            aria-label="Unit"
            value={target.customUnit}
            onChange={(event) => onChange({ ...target, customUnit: event.target.value as SizeUnit })}
            className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3.5 py-2.5 text-base font-medium"
          >
            <option value="MB">MB</option>
            <option value="KB">KB</option>
          </select>
        </div>
      )}
    </fieldset>
  )
}
