import { formatBytes, presetsFor, type FileCategory, type PresetId } from '@revel/core'
import { useI18n, type TranslationKey } from '../lib/i18n'
import type { SizeUnit, Target } from '../lib/target'
import { INPUT_CLASS, SECTION_HEAD, SELECT_CLASS } from './styles'

const PRESET_KEY: Record<PresetId, TranslationKey> = {
  discord: 'preset.discord',
  whatsapp: 'preset.whatsapp',
  email: 'preset.gmail',
  'portal-id': 'preset.strict_id',
  'standard-form': 'preset.standard_form',
  'visa-portal': 'preset.visa_portal',
  'standard-doc': 'preset.standard_doc',
  'email-packet': 'preset.email_packet',
  'text-small': 'preset.text_small',
  'text-medium': 'preset.text_medium',
  'text-large': 'preset.text_large',
}

interface TargetPickerProps {
  category: FileCategory
  target: Target
  sourceBytes?: number
  onChange: (target: Target) => void
}

export function TargetPicker({ category, target, sourceBytes, onChange }: TargetPickerProps) {
  const { t } = useI18n()
  const isCustom = target.choice === 'custom'
  const presets = presetsFor(category)

  return (
    <fieldset>
      <legend className={`mb-2 ${SECTION_HEAD}`}>{t('shrink.fitUnder')}</legend>
      <div className="grid grid-cols-2 gap-2">
        {presets.map((preset) => {
          const active = target.choice === preset.id
          const alreadyFits = Boolean(sourceBytes && sourceBytes > 0 && preset.maxBytes >= sourceBytes)
          return (
            <button
              key={preset.id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange({ ...target, choice: preset.id })}
              className={`flex cursor-pointer flex-col justify-between gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                active
                  ? 'border-[var(--app-accent)] bg-[var(--app-accent-soft)] text-[var(--app-text)]'
                  : 'border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)] hover:border-[var(--app-border-strong)]'
              }`}
            >
              <span className="truncate text-sm font-medium">
                {t(PRESET_KEY[preset.id as PresetId])}
              </span>
              <span className="flex items-center justify-between gap-1.5 text-xs tabular-nums">
                <span
                  className={
                    active ? 'font-medium text-[var(--app-accent-text)]' : 'text-[var(--app-text-muted)]'
                  }
                >
                  &lt; {formatBytes(preset.maxBytes)}
                </span>
                {alreadyFits && (
                  <span className="text-[11px] text-[var(--app-text-muted)]">
                    {t('shrink.alreadyFits')}
                  </span>
                )}
              </span>
            </button>
          )
        })}

        <button
          type="button"
          aria-pressed={isCustom}
          onClick={() => onChange({ ...target, choice: 'custom' })}
          className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors ${
            presets.length % 2 === 0 ? 'col-span-2' : ''
          } ${
            isCustom
              ? 'border-[var(--app-accent)] bg-[var(--app-accent-soft)] text-[var(--app-text)]'
              : 'border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)] hover:border-[var(--app-border-strong)]'
          }`}
        >
          <span className="text-sm font-medium">{t('shrink.custom')}</span>
          <span
            className={`text-xs ${
              isCustom ? 'font-medium text-[var(--app-accent-text)]' : 'text-[var(--app-text-muted)]'
            }`}
          >
            MB / KB
          </span>
        </button>
      </div>

      {isCustom && (
        <div className="mt-2 flex gap-2">
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
            className={`${INPUT_CLASS} h-10 min-w-0 flex-1 tabular-nums`}
          />
          <select
            aria-label="Unit"
            value={target.customUnit}
            onChange={(event) => onChange({ ...target, customUnit: event.target.value as SizeUnit })}
            className={`${SELECT_CLASS} h-10`}
          >
            <option value="MB">MB</option>
            <option value="KB">KB</option>
          </select>
        </div>
      )}
    </fieldset>
  )
}
