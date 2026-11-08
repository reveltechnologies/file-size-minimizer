import type { ProgressStep } from '../engines'
import { useSmoothProgress } from '../lib/useSmoothProgress'
import { ProgressBar } from './ProgressBar'
import { CARD, SECONDARY_BUTTON } from './styles'

const STEPS: { step: ProgressStep; label: string }[] = [
  { step: 'prepare', label: 'Preparing' },
  { step: 'shrink', label: 'Shrinking' },
  { step: 'done', label: 'Done' },
]

interface ProgressPanelProps {
  /** e.g. "Shrinking your video…" */
  title: string
  step: ProgressStep
  ratio: number
  status: string
  onCancel: () => void
}

export function ProgressPanel({ title, step, ratio, status, onCancel }: ProgressPanelProps) {
  const shown = useSmoothProgress(step, ratio)
  const current = STEPS.findIndex((s) => s.step === step)
  const done = step === 'done'

  return (
    <section className={`${CARD} my-auto flex flex-col gap-5 py-6`}>
      <p className="text-center text-lg font-bold tracking-tight">{done ? 'All done!' : title}</p>

      <ProgressBar ratio={shown} label={done ? 'Your file is ready' : status || 'Starting…'} />

      <ol className="flex items-center gap-1.5 text-xs font-medium">
        {STEPS.map(({ step: s, label }, i) => {
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
                  {finished ? '✓' : i + 1}
                </span>
                {label}
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

      <p className="text-center text-xs text-slate-500 dark:text-slate-400">
        🔒 Your file never leaves this phone. Keep the app open.
      </p>
      {!done && (
        <button type="button" onClick={onCancel} className={SECONDARY_BUTTON}>
          Cancel
        </button>
      )}
    </section>
  )
}
