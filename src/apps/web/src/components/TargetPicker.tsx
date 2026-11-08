import { formatBytes, presetsFor, type FileCategory, type PresetId } from '@revel/core'
import { useI18n, type TranslationKey } from '../lib/i18n'
import type { SizeUnit, Target } from '../lib/target'
import { choiceClass } from './styles'

const PRESET_KEY: Record<PresetId, TranslationKey> = {
  discord: 'preset.discord',
  whatsapp: 'preset.whatsapp',
  email: 'preset.gmail',
  'portal-id': 'preset.strict_id',
  'standard-form': 'preset.standard_form',
  'visa-portal': 'preset.visa_portal',
  'standard-doc': 'preset.standard_doc',
  'email-packet': 'preset.email_packet',
}

interface TargetPickerProps {
  category: FileCategory
  target: Target
  onChange: (target: Target) => void
}

export function TargetPicker({ category, target, onChange }: TargetPickerProps) {
  const { t } = useI18n()
  const isCustom = target.choice === 'custom'

  return (
    <fieldset>
      <legend className="mb-2 text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
        {t('shrink.fitUnder')}
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
            <span className="block truncate font-semibold">
              {t(PRESET_KEY[preset.id as PresetId])}
            </span>
            <span className="block text-xs opacity-80">&lt; {formatBytes(preset.maxBytes)}</span>
          </button>
        ))}
        <button
          type="button"
          aria-pressed={isCustom}
          onClick={() => onChange({ ...target, choice: 'custom' })}
          className={choiceClass(isCustom)}
        >
          <span className="block font-semibold">{t('shrink.custom')}</span>
          <span className="block text-xs opacity-80">{t('shrink.yourLimit')}</span>
        </button>
      </div>

      {isCustom && (
        <div className="mt-2.5 flex gap-2">
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            placeholder="8"
            aria-label={t('shrink.custom')}
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
