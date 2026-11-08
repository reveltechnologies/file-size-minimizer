export const CARD =
  'rounded-3xl border border-[var(--app-border)] bg-[var(--app-card)] p-4 shadow-sm'

export const SUBTLE_BOX =
  'rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)]'

export const PRIMARY_BUTTON =
  'w-full rounded-2xl bg-emerald-600 px-5 py-3.5 text-base font-semibold text-white shadow-sm transition active:scale-[0.98] active:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100'

export const SECONDARY_BUTTON =
  'w-full rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-5 py-3.5 text-base font-semibold text-slate-800 transition active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 dark:text-slate-100'

/** A touch-friendly button in a 2-column mobile grid of choices, like the size presets. */
export function choiceClass(active: boolean): string {
  return `min-h-14 rounded-2xl border px-3.5 py-2.5 text-left text-sm transition active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${
    active
      ? 'border-emerald-500 bg-emerald-600 text-white shadow-xs'
      : 'border-[var(--app-border)] bg-[var(--app-subtle)] text-slate-900 dark:text-slate-100'
  }`
}

export const WARNING =
  'rounded-2xl border border-amber-300 bg-amber-50 px-3.5 py-3 text-xs leading-relaxed text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200'
