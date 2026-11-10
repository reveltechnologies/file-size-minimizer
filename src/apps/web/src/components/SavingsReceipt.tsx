import { formatBytes } from '@revel/core'
import { useMemo } from 'react'
import type { CompressResult } from '../engines'
import { useI18n } from '../lib/i18n'
import { canShareFile, downloadBlob, shareBlob } from '../lib/saveFile'
import type { OutputLocationMode } from '../lib/settingsStore'
import { CARD, PRIMARY_BUTTON, SECONDARY_BUTTON } from './styles'

interface SavingsReceiptProps {
  originalBytes: number
  maxBytes: number
  result: CompressResult
  outputLocationMode: OutputLocationMode
  onReset: () => void
}

export function SavingsReceipt({
  originalBytes,
  maxBytes,
  result,
  outputLocationMode,
  onReset,
}: SavingsReceiptProps) {
  const { t } = useI18n()
  const { blob, fileName } = result
  const isReduced = blob.size < originalBytes
  const isSame = blob.size === originalBytes
  const fits = blob.size <= maxBytes && !isSame
  const savedPercent = isReduced
    ? Math.max(1, Math.round((1 - blob.size / originalBytes) * 100))
    : 0
  const savedBytes = isReduced ? originalBytes - blob.size : 0
  const shareable = useMemo(() => canShareFile(blob, fileName), [blob, fileName])

  return (
    <section className={`${CARD} w-full my-auto flex flex-col items-center py-8 px-5 text-center`}>
      <span
        className={`mb-3 flex size-14 items-center justify-center rounded-2xl ${
          isReduced || isSame
            ? 'bg-emerald-500/15 text-emerald-500'
            : 'bg-amber-500/15 text-amber-500'
        }`}
      >
        {isReduced || isSame ? (
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="size-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : (
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="size-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          </svg>
        )}
      </span>

      <div className="flex items-center gap-2 text-2xl font-bold tabular-nums">
        <span>{formatBytes(originalBytes)}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-5 text-slate-400"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12h14m-6-6 6 6-6 6" />
        </svg>
        <span className={isReduced || isSame ? 'text-emerald-500' : 'text-amber-500'}>
          {formatBytes(blob.size)}
        </span>
      </div>

      {isReduced && (
        <p className="mt-1 text-sm font-semibold text-emerald-500">
          -{savedPercent}% ({formatBytes(savedBytes)})
        </p>
      )}

      {isSame && (
        <p className="mt-1 text-xs font-semibold text-emerald-500">
          {t('receipt.alreadyOptimal')}
        </p>
      )}

      {!fits && !isSame && (
        <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">
          {t('receipt.smallestPossible', { size: formatBytes(maxBytes) })}
        </p>
      )}

      <p className="mt-1 w-full truncate text-xs text-slate-500 dark:text-slate-400">{fileName}</p>

      <div className="mt-6 flex w-full flex-col gap-2.5">
        <button
          type="button"
          onClick={() => void downloadBlob(blob, fileName, outputLocationMode)}
          className={`${PRIMARY_BUTTON} flex items-center justify-center gap-2`}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="size-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 4v12m0 0-4-4m4 4 4-4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
          </svg>
          <span>{t('common.save')}</span>
        </button>
        {shareable && (
          <button
            type="button"
            onClick={() => void shareBlob(blob, fileName).catch(console.error)}
            className={SECONDARY_BUTTON}
          >
            {t('common.share')}
          </button>
        )}
        <button type="button" onClick={onReset} className={SECONDARY_BUTTON}>
          {t('common.done')}
        </button>
      </div>
    </section>
  )
}
