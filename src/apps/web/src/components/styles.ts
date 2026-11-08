export const CARD =
  'rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900'

export const PRIMARY_BUTTON =
  'w-full rounded-2xl bg-blue-600 px-5 py-3.5 text-base font-semibold text-white shadow-sm transition active:scale-[0.98] active:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100'

export const SECONDARY_BUTTON =
  'w-full rounded-2xl border border-slate-300 bg-white px-5 py-3.5 text-base font-semibold text-slate-800 transition active:scale-[0.98] active:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:active:bg-slate-800'

/** A touch-friendly button in a 2-column mobile grid of choices, like the size presets. */
export function choiceClass(active: boolean): string {
  return `min-h-14 rounded-2xl border px-3.5 py-2.5 text-left text-sm transition active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
    active
      ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
      : 'border-slate-200 bg-slate-50/70 text-slate-900 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-100'
  }`
}

export const WARNING =
  'rounded-2xl border border-amber-300 bg-amber-50 px-3.5 py-3 text-xs leading-relaxed text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200'
