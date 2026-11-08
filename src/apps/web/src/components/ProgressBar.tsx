interface ProgressBarProps {
  ratio: number
  label: string
}

export function ProgressBar({ ratio, label }: ProgressBarProps) {
  const percent = Math.round(ratio * 100)

  return (
    <div>
      <div className="mb-2 flex justify-between gap-3 text-sm">
        <span className="truncate text-slate-600 dark:text-slate-300">{label}</span>
        <span className="tabular-nums">{percent}%</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2.5 overflow-hidden rounded-full bg-[var(--app-subtle)]"
      >
        <div
          className="h-full rounded-full bg-emerald-500 transition-[width] duration-300"
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  )
}
