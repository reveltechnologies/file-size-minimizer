import type { ProgressStep } from '../engines'
import { useI18n } from '../lib/i18n'
import { useSmoothProgress } from '../lib/useSmoothProgress'
import { ProgressBar } from './ProgressBar'
import { SECONDARY_BUTTON } from './styles'

interface ProgressPanelProps {
  title: string
  fileName?: string
  step: ProgressStep
  ratio: number
  status: string
  onCancel: () => void
}

export function ProgressPanel({
  title,
  fileName,
  step,
  ratio,
  status,
  onCancel,
}: ProgressPanelProps) {
  const { t } = useI18n()
  const shown = useSmoothProgress(step, ratio)
  const done = step === 'done'

  return (
    <section
      aria-live="polite"
      className="my-auto flex flex-col gap-4 border-y border-[var(--app-border)] py-5"
    >
      <div>
        <p className="text-sm font-medium text-[var(--app-text)]">{title}</p>
        {fileName && (
          <p className="mt-0.5 truncate text-xs text-[var(--app-text-muted)]">{fileName}</p>
        )}
      </div>

      <ProgressBar ratio={shown} label={status || t('progress.working')} />

      {!done && (
        <button type="button" onClick={onCancel} className={SECONDARY_BUTTON}>
          {t('common.cancel')}
        </button>
      )}
    </section>
  )
}
