interface ProgressBarProps {
  ratio: number
  label: string
}

export function ProgressBar({ ratio, label }: ProgressBarProps) {
  const percent = Math.round(ratio * 100)

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="truncate text-sm text-[var(--app-text-muted)]">{label}</span>
        <span className="text-sm font-medium tabular-nums text-[var(--app-text)]">{percent}%</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-1.5 overflow-hidden rounded-full bg-[var(--app-surface-2)]"
      >
        <div
          className="h-full rounded-full bg-[var(--app-accent)] transition-[width] duration-300"
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  )
}
