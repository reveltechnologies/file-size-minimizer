export const CARD =
  'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900'

export const PRIMARY_BUTTON =
  'rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50'

export const SECONDARY_BUTTON =
  'rounded-xl border border-slate-300 px-5 py-3 font-semibold transition hover:border-blue-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-slate-700'

/** A button in a row of choices, like the size presets. */
export function choiceClass(active: boolean): string {
  return `rounded-xl border px-3 py-2 text-left text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
    active
      ? 'border-blue-600 bg-blue-600 text-white'
      : 'border-slate-300 hover:border-blue-400 dark:border-slate-700'
  }`
}

export const WARNING =
  'rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200'
