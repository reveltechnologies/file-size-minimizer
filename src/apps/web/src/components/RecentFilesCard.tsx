import { formatBytes } from '@revel/core'
import type { HistoryEntry } from '../lib/historyStore'
import { downloadBlob } from '../lib/saveFile'
import type { OutputLocationMode } from '../lib/settingsStore'
import { CARD, SUBTLE_BOX } from './styles'

interface RecentFilesCardProps {
  title: string
  entries: HistoryEntry[]
  outputLocationMode: OutputLocationMode
  onOpen?: (entry: HistoryEntry) => void
  onClear: () => void
}

export function RecentFilesCard({
  title,
  entries,
  outputLocationMode,
  onOpen,
  onClear,
}: RecentFilesCardProps) {
  if (entries.length === 0) return null

  return (
    <section className={`${CARD} flex flex-col gap-2.5`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
          {title} ({entries.length}/10)
        </h2>
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear history"
          title="Clear"
          className="rounded-lg p-1 text-slate-500 active:opacity-70 dark:text-slate-400"
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
            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14" />
          </svg>
        </button>
      </div>

      <ul className="flex max-h-52 flex-col gap-2 overflow-y-auto">
        {entries.map((item) => {
          const savedPct =
            item.originalSize && item.originalSize > 0
              ? Math.max(0, Math.floor((1 - item.size / item.originalSize) * 100))
              : null

          return (
            <li
              key={item.id}
              className={`${SUBTLE_BOX} flex items-center justify-between gap-2 px-3 py-2`}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">{item.fileName}</p>
                <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                  {formatBytes(item.size)}
                  {savedPct !== null && ` (-${savedPct}%)`}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                {onOpen && (
                  <button
                    type="button"
                    onClick={() => onOpen(item)}
                    aria-label={`View ${item.fileName}`}
                    title="View"
                    className="flex size-8 items-center justify-center rounded-xl border border-[var(--app-border)] active:scale-95"
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
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void downloadBlob(item.blob, item.fileName, outputLocationMode)}
                  aria-label={`Download ${item.fileName}`}
                  title="Download"
                  className="flex size-8 items-center justify-center rounded-xl bg-emerald-600 text-white active:scale-95"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="size-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
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
