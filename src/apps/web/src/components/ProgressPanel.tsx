import type { ProgressStep } from '../engines'
import { useI18n, type TranslationKey } from '../lib/i18n'
import { useSmoothProgress } from '../lib/useSmoothProgress'
import { ProgressBar } from './ProgressBar'
import { CARD, SECONDARY_BUTTON } from './styles'

const STEPS: { step: ProgressStep; labelKey: TranslationKey }[] = [
  { step: 'prepare', labelKey: 'progress.prepare' },
  { step: 'shrink', labelKey: 'progress.shrink' },
  { step: 'done', labelKey: 'progress.done' },
]

interface ProgressPanelProps {
  title: string
  step: ProgressStep
  ratio: number
  status: string
  onCancel: () => void
}

export function ProgressPanel({ title, step, ratio, status, onCancel }: ProgressPanelProps) {
  const { t } = useI18n()
  const shown = useSmoothProgress(step, ratio)
  const current = STEPS.findIndex((s) => s.step === step)
  const done = step === 'done'

  return (
    <section className={`${CARD} my-auto flex flex-col gap-5 py-6`}>
      <p className="text-center text-base font-bold tracking-tight">
        {done ? t('progress.done') : title}
      </p>

      <ProgressBar
        ratio={shown}
        label={done ? t('progress.complete') : status || t('progress.working')}
      />

      <ol className="flex items-center gap-1.5 text-xs font-medium">
        {STEPS.map(({ step: s, labelKey }, i) => {
          const finished = i < current || done
          const active = i === current && !done
          return (
            <li key={s} className="flex flex-1 items-center gap-1.5 last:flex-none">
              <span
                aria-current={active ? 'step' : undefined}
                className={`flex items-center gap-1.5 ${
                  finished || active
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs ${
                    finished
                      ? 'bg-emerald-600 text-white'
                      : active
                        ? 'bg-emerald-600 text-white ring-4 ring-emerald-500/25'
                        : 'border border-[var(--app-border)]'
                  }`}
                >
                  {finished ? (
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="size-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </span>
                {t(labelKey)}
              </span>
              {i < STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className={`h-px flex-1 ${finished ? 'bg-emerald-600' : 'bg-[var(--app-border)]'}`}
                />
              )}
            </li>
          )
        })}
      </ol>

      {!done && (
        <button type="button" onClick={onCancel} className={SECONDARY_BUTTON}>
          {t('common.cancel')}
        </button>
      )}
    </section>
  )
}
