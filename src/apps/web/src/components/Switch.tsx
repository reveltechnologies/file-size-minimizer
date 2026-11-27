interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  ariaLabel?: string
}

export function Switch({ checked, onChange, ariaLabel }: SwitchProps) {
  return (
    <span className="relative inline-flex h-5 w-9 shrink-0 items-center">
      <input
        type="checkbox"
        aria-label={ariaLabel}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="h-5 w-9 rounded-full bg-[var(--app-border-strong)] transition-colors peer-checked:bg-[var(--app-accent)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--app-accent)]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-0.5 size-4 rounded-full bg-white shadow-xs transition-transform peer-checked:translate-x-4"
      />
    </span>
  )
}
