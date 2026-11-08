import { formatBytes } from '@revel/core'
import { useMemo } from 'react'
import type { CompressResult } from '../engines'
import { canShareFile, downloadBlob, shareBlob } from '../lib/saveFile'
import { CARD, PRIMARY_BUTTON, SECONDARY_BUTTON } from './styles'

/** Photos can come out in a different format than they went in, so say which. */
const PHOTO_FORMAT: Record<string, string> = { 'image/jpeg': 'JPG', 'image/png': 'PNG' }

interface SavingsReceiptProps {
  originalBytes: number
  maxBytes: number
  result: CompressResult
  onReset: () => void
}

export function SavingsReceipt({ originalBytes, maxBytes, result, onReset }: SavingsReceiptProps) {
  const { blob, fileName } = result
  // Rounded down so 99.8% never shows as "100% smaller".
  const savedPercent = Math.max(0, Math.floor((1 - blob.size / originalBytes) * 100))
  const fits = blob.size <= maxBytes
  const shareable = useMemo(() => canShareFile(blob, fileName), [blob, fileName])

  return (
    <section className={`${CARD} my-auto flex flex-col items-center py-6 text-center`}>
      <span
        className={`mb-3 flex size-14 items-center justify-center rounded-2xl text-2xl ${
          fits
            ? 'bg-green-500/15 text-green-600 dark:text-green-400'
            : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
        }`}
      >
        {fits ? '✓' : '⚠'}
      </span>
      <p className="text-xs font-semibold tracking-widest text-slate-500 uppercase dark:text-slate-400">
        Savings receipt
      </p>
      <p className="mt-2 text-2xl font-bold tabular-nums">
        {formatBytes(originalBytes)} →{' '}
        <span className={fits ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}>
          {formatBytes(blob.size)}
        </span>
      </p>
      <p className="mt-1.5 text-sm font-medium">
        {savedPercent}% smaller
        {fits && ` · Fits under ${formatBytes(maxBytes)}`}
      </p>
      {!fits && (
        <p className="mt-2 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
          Couldn't get under {formatBytes(maxBytes)}. This is the smallest we could make it.
        </p>
      )}
      <p className="mt-1.5 w-full truncate text-xs text-slate-500 dark:text-slate-400">
        {PHOTO_FORMAT[blob.type] && `Saved as ${PHOTO_FORMAT[blob.type]} · `}
        {fileName}
      </p>

      <div className="mt-6 flex w-full flex-col gap-2.5">
        <button type="button" onClick={() => downloadBlob(blob, fileName)} className={PRIMARY_BUTTON}>
          Save to device
        </button>
        {shareable && (
          <button
            type="button"
            onClick={() => void shareBlob(blob, fileName).catch(console.error)}
            className={SECONDARY_BUTTON}
          >
            Share…
          </button>
        )}
        <button type="button" onClick={onReset} className={SECONDARY_BUTTON}>
          Shrink another file
        </button>
      </div>
    </section>
  )
}
