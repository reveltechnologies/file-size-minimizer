import { formatBytes } from '@revel/core'
import type { HistoryEntry } from '../lib/historyStore'
import { useI18n } from '../lib/i18n'
import { downloadBlob } from '../lib/saveFile'
import type { OutputLocationMode } from '../lib/settingsStore'
import { DIVIDER_LIST, ICON_BUTTON, SECTION_HEAD } from './styles'

interface RecentFilesCardProps {
  title: string
  entries: HistoryEntry[]
  outputLocationMode: OutputLocationMode
  onOpen?: (entry: HistoryEntry) => void
  onClear: () => void
  onNotify?: (message: string) => void
}

export function RecentFilesCard({
  title,
  entries,
  outputLocationMode,
  onOpen,
  onClear,
  onNotify,
}: RecentFilesCardProps) {
  const { t } = useI18n()
  if (entries.length === 0) return null

  async function handleDownload(entry: HistoryEntry) {
    const outcome = await downloadBlob(entry.blob, entry.fileName, outputLocationMode)
    if (outcome === 'saved') onNotify?.(t('common.saved'))
  }

  return (
    <section className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <h2 className={SECTION_HEAD}>{title}</h2>
        <button
          type="button"
          onClick={onClear}
          aria-label={t('common.clear')}
          title={t('common.clear')}
          className="cursor-pointer rounded px-1.5 py-0.5 text-xs font-medium text-[var(--app-text-muted)] transition-colors hover:text-[var(--app-text)]"
        >
          {t('common.clear')}
        </button>
      </div>

      <ul
        data-scrollable="true"
        className={`${DIVIDER_LIST} max-h-56 overflow-y-auto border-t border-[var(--app-border)]`}
      >
        {entries.map((item) => {
          const savedPct =
            item.originalSize && item.originalSize > 0
              ? Math.max(0, Math.floor((1 - item.size / item.originalSize) * 100))
              : null

          return (
            <li key={item.id} className="flex items-center justify-between gap-2 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--app-text)]">
                  {item.fileName}
                </p>
                <p className="truncate text-xs tabular-nums text-[var(--app-text-muted)]">
                  {formatBytes(item.size)}
                  {savedPct !== null && ` (-${savedPct}%)`}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {onOpen && (
                  <button
                    type="button"
                    onClick={() => onOpen(item)}
                    aria-label={`${t('common.view')} ${item.fileName}`}
                    title={t('common.view')}
                    className={ICON_BUTTON}
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="size-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void handleDownload(item)}
                  aria-label={`${t('common.download')} ${item.fileName}`}
                  title={t('common.download')}
                  className={ICON_BUTTON}
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="size-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 4v12m0 0-4-4m4 4 4-4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                  </svg>
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
