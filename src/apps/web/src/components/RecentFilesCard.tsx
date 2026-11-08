import { formatBytes } from '@revel/core'
import type { HistoryEntry } from '../lib/historyStore'
import { downloadBlob } from '../lib/saveFile'
import { CARD, SUBTLE_BOX } from './styles'

interface RecentFilesCardProps {
  title: string
  entries: HistoryEntry[]
  onOpen?: (entry: HistoryEntry) => void
  onClear: () => void
}

export function RecentFilesCard({ title, entries, onOpen, onClear }: RecentFilesCardProps) {
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
          className="text-xs font-semibold text-slate-500 active:opacity-70 dark:text-slate-400"
        >
          Clear
        </button>
      </div>

      <ul className="flex max-h-56 flex-col gap-2 overflow-y-auto pr-0.5">
        {entries.map((item) => {
          const savedPct =
            item.originalSize && item.originalSize > 0
              ? Math.max(0, Math.floor((1 - item.size / item.originalSize) * 100))
              : null

          return (
            <li
              key={item.id}
              className={`${SUBTLE_BOX} flex items-center justify-between gap-2.5 px-3 py-2`}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">{item.fileName}</p>
                <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                  {item.originalSize
                    ? `${formatBytes(item.originalSize)} → ${formatBytes(item.size)}`
                    : formatBytes(item.size)}
                  {savedPct !== null && ` (${savedPct}% smaller)`}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                {onOpen && (
                  <button
                    type="button"
                    onClick={() => onOpen(item)}
                    className="rounded-xl border border-[var(--app-border)] px-2.5 py-1.5 text-xs font-semibold active:scale-95"
                  >
                    View
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => downloadBlob(item.blob, item.fileName)}
                  className="rounded-xl bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white active:scale-95"
                >
                  Download
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

