import { formatBytes } from '@revel/core'
import { useEffect, useMemo, useState } from 'react'
import type { CompressResult } from '../engines'
import { useI18n } from '../lib/i18n'
import { canShareFile, downloadBlob, shareBlob } from '../lib/saveFile'
import type { OutputLocationMode } from '../lib/settingsStore'
import { DIVIDER_LIST, PRIMARY_BUTTON, SECONDARY_BUTTON } from './styles'

interface SavingsReceiptProps {
  originalBytes: number
  maxBytes: number
  result: CompressResult
  outputLocationMode: OutputLocationMode
  onReset: () => void
  onPreview?: (file: File) => void
  onNotify?: (message: string) => void
}

export function SavingsReceipt({
  originalBytes,
  maxBytes,
  result,
  outputLocationMode,
  onReset,
  onPreview,
  onNotify,
}: SavingsReceiptProps) {
  const { t } = useI18n()
  const { blob, fileName } = result
  const [saved, setSaved] = useState(false)
  const isReduced = blob.size < originalBytes
  const isSame = blob.size === originalBytes
  const fits = blob.size <= maxBytes && !isSame
  const savedPercent = isReduced
    ? Math.max(1, Math.round((1 - blob.size / originalBytes) * 100))
    : 0
  const savedBytes = isReduced ? originalBytes - blob.size : 0
  const shareable = useMemo(() => canShareFile(blob, fileName), [blob, fileName])
  const previewUrl = useMemo(
    () => (blob.type.startsWith('image/') ? URL.createObjectURL(blob) : null),
    [blob],
  )

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  async function handleSave() {
    const outcome = await downloadBlob(blob, fileName, outputLocationMode)
    if (outcome === 'saved') {
      setSaved(true)
      onNotify?.(t('common.saved'))
      setTimeout(() => setSaved(false), 1800)
    }
  }

  return (
    <div className="my-auto flex w-full flex-col gap-4">
      {previewUrl && (
        <div className="flex justify-center">
          <img
            src={previewUrl}
            alt={fileName}
            className="max-h-36 w-auto rounded-lg border border-[var(--app-border)] object-contain"
          />
        </div>
      )}

      <div className={`${DIVIDER_LIST} border-y border-[var(--app-border)]`}>
        <div className="flex items-center justify-between gap-3 py-3 text-sm">
          <span className="text-[var(--app-text-muted)]">{t('receipt.original')}</span>
          <span className="tabular-nums text-[var(--app-text)]">{formatBytes(originalBytes)}</span>
        </div>

        <div className="flex items-center justify-between gap-3 py-3 text-sm">
          <span className="text-[var(--app-text-muted)]">{t('receipt.result')}</span>
          <span
            className={`font-semibold tabular-nums ${
              isReduced
                ? 'text-[var(--app-accent-text)]'
                : isSame
                  ? 'text-[var(--app-text)]'
                  : 'text-[var(--app-warn)]'
            }`}
          >
            {formatBytes(blob.size)}
            {isReduced && ` (-${savedPercent}% · -${formatBytes(savedBytes)})`}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 py-3 text-sm">
          <span className="shrink-0 text-[var(--app-text-muted)]">{t('receipt.file')}</span>
          <span className="truncate text-[var(--app-text)]">{fileName}</span>
        </div>
      </div>

      {isSame && (
        <p className="text-xs text-[var(--app-text-muted)]">{t('receipt.alreadyOptimal')}</p>
      )}
      {!fits && !isSame && isReduced && (
        <p className="text-xs text-[var(--app-warn)]">
          {t('receipt.smallestPossible', { size: formatBytes(maxBytes) })}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <button type="button" onClick={() => void handleSave()} className={PRIMARY_BUTTON}>
          {saved ? t('common.saved') : t('common.save')}
        </button>

        <div className="flex gap-2">
          {onPreview && (
            <button
              type="button"
              onClick={() => onPreview(new File([blob], fileName, { type: blob.type }))}
              className={SECONDARY_BUTTON}
            >
              {t('common.preview')}
            </button>
          )}
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
      </div>
    </div>
  )
}
