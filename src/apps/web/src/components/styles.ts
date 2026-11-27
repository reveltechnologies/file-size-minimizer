export const SECTION_HEAD = 'text-xs font-medium text-[var(--app-text-muted)]'

export const DIVIDER_LIST = 'divide-y divide-[var(--app-border)]'

export const PRIMARY_BUTTON =
  'inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[var(--app-accent)] px-4 text-[15px] font-semibold text-white transition-colors hover:bg-[var(--app-accent-hover)] active:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-accent)] disabled:cursor-not-allowed disabled:opacity-45'

export const SECONDARY_BUTTON =
  'inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-[var(--app-border-strong)] bg-[var(--app-surface)] px-4 text-sm font-medium text-[var(--app-text)] transition-colors hover:bg-[var(--app-surface-2)] active:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-accent)] disabled:cursor-not-allowed disabled:opacity-45'

export const ICON_BUTTON =
  'inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-surface-2)] hover:text-[var(--app-text)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--app-accent)]'

export const INPUT_CLASS =
  'rounded-lg border border-[var(--app-border-strong)] bg-[var(--app-surface)] px-3 py-2 text-sm text-[var(--app-text)] placeholder:text-[var(--app-text-muted)] transition-colors focus:border-[var(--app-accent)] focus:outline-none'

export const SELECT_CLASS =
  'h-9 rounded-lg border border-[var(--app-border-strong)] bg-[var(--app-surface)] px-2.5 text-sm font-medium text-[var(--app-text)] transition-colors focus:border-[var(--app-accent)] focus:outline-none'

export const WARNING =
  'rounded-lg border border-[var(--app-warn-border)] bg-[var(--app-warn-soft)] px-3 py-2.5 text-xs leading-relaxed text-[var(--app-warn)]'

export const ERROR_BOX =
  'rounded-lg border border-[var(--app-danger-border)] bg-[var(--app-danger-soft)] px-3 py-2.5 text-xs leading-relaxed text-[var(--app-danger)]'

export function segmentClass(active: boolean): string {
  return `rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--app-accent)] ${
    active
      ? 'bg-[var(--app-bg)] text-[var(--app-text)] shadow-2xs'
      : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
  }`
}
