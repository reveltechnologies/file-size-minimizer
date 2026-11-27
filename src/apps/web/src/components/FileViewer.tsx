import { detectCategory, formatBytes } from '@revel/core'
import { useEffect, useMemo, useRef, useState } from 'react'
import { parseDelimited } from '../lib/csv'
import type { HistoryEntry } from '../lib/historyStore'
import { useI18n } from '../lib/i18n'
import { downloadBlob } from '../lib/saveFile'
import type { OutputLocationMode } from '../lib/settingsStore'
import { RecentFilesCard } from './RecentFilesCard'
import { ERROR_BOX, ICON_BUTTON, INPUT_CLASS } from './styles'

const MAX_TEXT_PREVIEW_BYTES = 1_500_000
const MAX_HEX_PREVIEW_BYTES = 4_096

type ViewerKind = 'text' | 'csv' | 'json' | 'image' | 'video' | 'audio' | 'pdf' | 'binary'

interface LoadedFileState {
  file: File
  kind: ViewerKind
  textContent: string
  truncated: boolean
  objectUrl: string | null
  pdfInfo: { pageCount: number; title?: string; author?: string } | null
  hexDump: string
  loading: boolean
  error: string | null
}

export interface ExternalViewerFile {
  id: number
  file: File
}

interface FileViewerProps {
  recentViewed: HistoryEntry[]
  outputLocationMode: OutputLocationMode
  externalFile?: ExternalViewerFile | null
  onFileViewed: (file: File) => void
  onClearViewed: () => void
  onShrinkFile?: (file: File) => void
  onNotify?: (message: string) => void
}

const TEXT_EXTENSIONS = new Set([
  'txt',
  'log',
  'md',
  'markdown',
  'rst',
  'ini',
  'cfg',
  'conf',
  'env',
  'yaml',
  'yml',
  'toml',
  'xml',
  'svg',
  'html',
  'htm',
  'css',
  'scss',
  'less',
  'js',
  'jsx',
  'ts',
  'tsx',
  'mjs',
  'cjs',
  'py',
  'rb',
  'php',
  'java',
  'kt',
  'kts',
  'c',
  'h',
  'cpp',
  'hpp',
  'cs',
  'go',
  'rs',
  'swift',
  'sql',
  'sh',
  'bash',
  'zsh',
  'bat',
  'ps1',
  'srt',
  'vtt',
  'sub',
  'gitignore',
  'gitattributes',
  'dockerfile',
  'makefile',
  'properties',
  'gradle',
])

const TOOL_BUTTON =
  'cursor-pointer rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 py-1 text-xs font-medium text-[var(--app-text)] transition-colors hover:bg-[var(--app-surface-2)]'

function getExtension(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : ''
}

function detectKind(file: File, sampleBytes: Uint8Array): ViewerKind {
  const ext = getExtension(file.name)
  const mime = file.type.toLowerCase()

  if (ext === 'json' || mime === 'application/json' || mime.endsWith('+json')) return 'json'
  if (ext === 'csv' || ext === 'tsv' || mime === 'text/csv' || mime === 'text/tab-separated-values') {
    return 'csv'
  }
  if (
    TEXT_EXTENSIONS.has(ext) ||
    mime.startsWith('text/') ||
    mime === 'application/xml' ||
    mime === 'application/javascript' ||
    mime === 'application/x-sh'
  ) {
    return 'text'
  }
  if (
    mime.startsWith('image/') ||
    ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'ico', 'avif', 'heic', 'heif'].includes(ext)
  ) {
    return 'image'
  }
  if (mime.startsWith('video/') || ['mp4', 'mov', 'webm', 'mkv', 'avi', 'm4v'].includes(ext)) {
    return 'video'
  }
  if (mime.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(ext)) {
    return 'audio'
  }
  if (mime === 'application/pdf' || ext === 'pdf') return 'pdf'

  let nullCount = 0
  for (let i = 0; i < sampleBytes.length; i++) {
    if (sampleBytes[i] === 0) nullCount++
  }
  return nullCount === 0 ? 'text' : 'binary'
}

function formatHexDump(bytes: Uint8Array): string {
  const lines: string[] = []
  for (let offset = 0; offset < bytes.length; offset += 16) {
    const slice = bytes.subarray(offset, offset + 16)
    const hexPart = Array.from(slice)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join(' ')
      .padEnd(47, ' ')
    const asciiPart = Array.from(slice)
      .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.'))
      .join('')
    lines.push(`${offset.toString(16).padStart(6, '0')}  ${hexPart}  ${asciiPart}`)
  }
  return lines.join('\n')
}

export function FileViewer({
  recentViewed,
  outputLocationMode,
  externalFile = null,
  onFileViewed,
  onClearViewed,
  onShrinkFile,
  onNotify,
}: FileViewerProps) {
  const { t } = useI18n()
  const [dragging, setDragging] = useState(false)
  const [state, setState] = useState<LoadedFileState | null>(null)
  const [wrapLines, setWrapLines] = useState(true)
  const [fontSize, setFontSize] = useState<'xs' | 'sm' | 'base'>('xs')
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState(false)
  const [csvMode, setCsvMode] = useState<'table' | 'raw'>('table')
  const [binaryMode, setBinaryMode] = useState<'text' | 'hex'>('text')
  const [prettyJson, setPrettyJson] = useState(true)
  const [imageZoom, setImageZoom] = useState(false)
  const lastExternalIdRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (state?.objectUrl) URL.revokeObjectURL(state.objectUrl)
    }
  }, [state?.objectUrl])

  async function openFile(file: File, recordHistory = true) {
    setSearch('')
    setCopied(false)
    setCsvMode('table')
    setBinaryMode('text')
    setPrettyJson(true)
    setImageZoom(false)

    if (recordHistory) onFileViewed(file)

    setState({
      file,
      kind: 'text',
      textContent: '',
      truncated: false,
      objectUrl: null,
      pdfInfo: null,
      hexDump: '',
      loading: true,
      error: null,
    })

    try {
      const slice = file.slice(0, MAX_TEXT_PREVIEW_BYTES)
      const buffer = await slice.arrayBuffer()
      const bytes = new Uint8Array(buffer)
      const sample = bytes.subarray(0, Math.min(bytes.length, 4096))
      const kind = detectKind(file, sample)
      const ext = getExtension(file.name)

      let objectUrl: string | null = null
      let pdfInfo: LoadedFileState['pdfInfo'] = null

      if (kind === 'image') {
        if (ext === 'heic' || ext === 'heif' || file.type === 'image/heic' || file.type === 'image/heif') {
          const { heicTo } = await import('heic-to')
          const converted = await heicTo({ blob: file, type: 'image/jpeg', quality: 0.9 })
          objectUrl = URL.createObjectURL(new Blob([converted], { type: 'image/jpeg' }))
        } else {
          const safeImageMime =
            file.type.startsWith('image/') && file.type !== 'image/svg+xml'
              ? file.type
              : 'image/jpeg'
          objectUrl = URL.createObjectURL(new Blob([file], { type: safeImageMime }))
        }
      } else if (kind === 'video' || kind === 'audio') {
        const fallbackMime = kind === 'video' ? 'video/mp4' : 'audio/mpeg'
        const safeMediaMime = file.type.startsWith(`${kind}/`) ? file.type : fallbackMime
        objectUrl = URL.createObjectURL(new Blob([file], { type: safeMediaMime }))
      } else if (kind === 'pdf') {
        objectUrl = URL.createObjectURL(new Blob([file], { type: 'application/pdf' }))
        try {
          const { PDFDocument } = await import('pdf-lib')
          const fullBuf = await file.arrayBuffer()
          const pdfDoc = await PDFDocument.load(fullBuf, { ignoreEncryption: true })
          pdfInfo = {
            pageCount: pdfDoc.getPageCount(),
            title: pdfDoc.getTitle(),
            author: pdfDoc.getAuthor(),
          }
        } catch {
          // Ignore PDF metadata read errors.
        }
      }

      const decoder = new TextDecoder('utf-8', { fatal: false })
      const textContent =
        kind === 'image' || kind === 'video' || kind === 'audio' ? '' : decoder.decode(bytes)
      const hexDump =
        kind === 'binary'
          ? formatHexDump(bytes.subarray(0, Math.min(bytes.length, MAX_HEX_PREVIEW_BYTES)))
          : ''

      setState({
        file,
        kind,
        textContent,
        truncated: file.size > MAX_TEXT_PREVIEW_BYTES,
        objectUrl,
        pdfInfo,
        hexDump,
        loading: false,
        error: null,
      })
    } catch (err) {
      setState({
        file,
        kind: 'text',
        textContent: '',
        truncated: false,
        objectUrl: null,
        pdfInfo: null,
        hexDump: '',
        loading: false,
        error: err instanceof Error ? err.message : 'Read error',
      })
    }
  }

  useEffect(() => {
    if (!externalFile || externalFile.id === lastExternalIdRef.current) return
    lastExternalIdRef.current = externalFile.id
    void Promise.resolve().then(() => openFile(externalFile.file, false))
  })

  function handleOpenFromHistory(entry: HistoryEntry) {
    const file = new File([entry.blob], entry.fileName, {
      type: entry.mimeType || entry.blob.type,
    })
    void openFile(file, true)
  }

  const baseText = useMemo(() => {
    if (!state) return ''
    let content = state.textContent
    if (state.kind === 'json' && prettyJson) {
      try {
        content = JSON.stringify(JSON.parse(content), null, 2)
      } catch {
        // Keep raw text.
      }
    }
    return content
  }, [state, prettyJson])

  const displayedText = useMemo(() => {
    if (!baseText) return ''
    if (search.trim()) {
      const q = search.toLowerCase()
      return baseText
        .split(/\r?\n/)
        .filter((line) => line.toLowerCase().includes(q))
        .join('\n')
    }
    return baseText
  }, [baseText, search])

  const totalLines = useMemo(() => (baseText ? baseText.split(/\r?\n/).length : 0), [baseText])
  const shownLines = useMemo(
    () => (displayedText ? displayedText.split(/\r?\n/).length : 0),
    [displayedText],
  )

  async function handleCopy() {
    if (!displayedText) return
    try {
      await navigator.clipboard.writeText(displayedText)
      setCopied(true)
      onNotify?.(t('viewer.copied'))
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Ignore clipboard permission errors.
    }
  }

  async function handleSave() {
    if (!state) return
    const outcome = await downloadBlob(state.file, state.file.name, outputLocationMode)
    if (outcome === 'saved') onNotify?.(t('common.saved'))
  }

  if (!state) {
    return (
      <div className="flex flex-1 flex-col gap-4">
        <label
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragging(false)
            const file = event.dataTransfer.files[0]
            if (file) void openFile(file)
          }}
          className={`flex flex-1 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl px-5 py-10 text-center transition-colors focus-within:ring-2 focus-within:ring-[var(--app-accent)] ${
            dragging
              ? 'border-2 border-dashed border-[var(--app-accent)] bg-[var(--app-accent-soft)]'
              : 'border-2 border-transparent'
          }`}
        >
          <input
            type="file"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void openFile(file)
              event.target.value = ''
            }}
          />
          <span className="flex size-12 items-center justify-center rounded-full bg-[var(--app-surface)] text-[var(--app-text-muted)]">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
            </svg>
          </span>
          <span className="inline-flex items-center rounded-lg border border-[var(--app-border-strong)] bg-[var(--app-surface)] px-4 py-2 text-sm font-medium text-[var(--app-text)] transition-colors hover:bg-[var(--app-surface-2)]">
            {t('viewer.openFile')}
          </span>
          <span className="text-xs text-[var(--app-text-muted)]">
            {t('viewer.supportedTypes')}
          </span>
        </label>

        <RecentFilesCard
          title={t('common.recent')}
          entries={recentViewed}
          outputLocationMode={outputLocationMode}
          onOpen={handleOpenFromHistory}
          onClear={onClearViewed}
          onNotify={onNotify}
        />
      </div>
    )
  }

  const fontSizeClass =
    fontSize === 'xs' ? 'text-xs' : fontSize === 'sm' ? 'text-sm' : 'text-base'

  const extLabel = (getExtension(state.file.name) || state.kind).toUpperCase()
  const shrinkable =
    Boolean(onShrinkFile) && detectCategory(state.file.name, state.file.type) !== null

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--app-border)] pb-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[var(--app-text)]">{state.file.name}</p>
          <p className="truncate text-xs tabular-nums text-[var(--app-text-muted)]">
            {extLabel} · {formatBytes(state.file.size)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {shrinkable && onShrinkFile && (
            <button
              type="button"
              onClick={() => onShrinkFile(state.file)}
              className="cursor-pointer rounded-md border border-[var(--app-border-strong)] bg-[var(--app-surface)] px-2.5 py-1 text-xs font-medium text-[var(--app-text)] transition-colors hover:bg-[var(--app-surface-2)]"
            >
              {t('common.shrinkThis')}
            </button>
          )}
          <button
            type="button"
            onClick={() => void handleSave()}
            aria-label={t('common.download')}
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
          <button
            type="button"
            onClick={() => setState(null)}
            aria-label={t('common.close')}
            title={t('common.close')}
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
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {state.loading ? (
        <div className="my-auto py-12 text-center text-xs text-[var(--app-text-muted)]">
          {t('common.loading')}
        </div>
      ) : state.error ? (
        <div className={ERROR_BOX}>{state.error}</div>
      ) : state.kind === 'image' && state.objectUrl ? (
        <div
          data-no-swipe="true"
          data-scrollable="true"
          className="flex flex-1 flex-col items-center justify-center overflow-auto rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-2"
        >
          <img
            src={state.objectUrl}
            alt={state.file.name}
            onClick={() => setImageZoom((z) => !z)}
            className={
              imageZoom
                ? 'max-w-none cursor-zoom-out'
                : 'max-h-[60dvh] w-auto cursor-zoom-in object-contain'
            }
          />
        </div>
      ) : state.kind === 'video' && state.objectUrl ? (
        <div className="flex flex-1 flex-col items-center justify-center overflow-hidden rounded-lg border border-[var(--app-border)] bg-black p-1">
          <video src={state.objectUrl} controls playsInline className="max-h-[60dvh] w-full" />
        </div>
      ) : state.kind === 'audio' && state.objectUrl ? (
        <div className="my-auto py-6">
          <audio src={state.objectUrl} controls className="w-full" />
        </div>
      ) : state.kind === 'pdf' ? (
        <div className="flex flex-1 flex-col gap-2">
          {state.pdfInfo && (
            <div className="flex items-center justify-between gap-2 text-xs text-[var(--app-text-muted)]">
              <span className="tabular-nums">
                {t('viewer.pages', { count: state.pdfInfo.pageCount })}
              </span>
              {state.pdfInfo.title && <span className="truncate">{state.pdfInfo.title}</span>}
            </div>
          )}
          {state.objectUrl && (
            <iframe
              src={state.objectUrl}
              title={state.file.name}
              className="min-h-[54dvh] w-full flex-1 rounded-lg border border-[var(--app-border)] bg-white"
            />
          )}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {state.kind === 'csv' && (
                <button
                  type="button"
                  onClick={() => setCsvMode(csvMode === 'table' ? 'raw' : 'table')}
                  className={TOOL_BUTTON}
                >
                  {csvMode === 'table' ? t('viewer.raw') : t('viewer.table')}
                </button>
              )}
              {state.kind === 'json' && (
                <button
                  type="button"
                  onClick={() => setPrettyJson(!prettyJson)}
                  className={TOOL_BUTTON}
                >
                  {prettyJson ? t('viewer.min') : t('viewer.pretty')}
                </button>
              )}
              {state.kind === 'binary' && (
                <button
                  type="button"
                  onClick={() => setBinaryMode(binaryMode === 'text' ? 'hex' : 'text')}
                  className={TOOL_BUTTON}
                >
                  {binaryMode === 'text' ? t('viewer.hex') : t('viewer.text')}
                </button>
              )}
              <button
                type="button"
                onClick={() => setWrapLines(!wrapLines)}
                className={TOOL_BUTTON}
              >
                {wrapLines ? t('viewer.unwrap') : t('viewer.wrap')}
              </button>
              <button
                type="button"
                onClick={() =>
                  setFontSize(fontSize === 'xs' ? 'sm' : fontSize === 'sm' ? 'base' : 'xs')
                }
                className={TOOL_BUTTON}
              >
                Aa
              </button>
            </div>

            <button
              type="button"
              onClick={() => void handleCopy()}
              className={`cursor-pointer rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                copied
                  ? 'border-[var(--app-accent)] bg-[var(--app-accent-soft)] text-[var(--app-accent-text)]'
                  : 'border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)] hover:bg-[var(--app-surface-2)]'
              }`}
            >
              {copied ? t('viewer.copied') : t('viewer.copy')}
            </button>
          </div>

          <input
            type="search"
            placeholder={t('viewer.search')}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className={`${INPUT_CLASS} w-full text-xs`}
          />

          {state.kind === 'csv' && csvMode === 'table' ? (
            <div
              data-no-swipe="true"
              data-scrollable="true"
              className="max-h-[55dvh] flex-1 overflow-auto rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)]"
            >
              <table className="w-full border-collapse text-left text-xs select-text">
                <tbody>
                  {parseDelimited(
                    displayedText,
                    getExtension(state.file.name) === 'tsv' ? '\t' : ',',
                  ).map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className={
                        rIdx === 0
                          ? 'sticky top-0 bg-[var(--app-surface-2)] font-semibold text-[var(--app-text)]'
                          : 'border-t border-[var(--app-border)] hover:bg-[var(--app-surface-2)]/40'
                      }
                    >
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className="border-r border-[var(--app-border)]/50 px-2.5 py-1.5 whitespace-nowrap last:border-r-0"
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <pre
              data-no-swipe="true"
              data-scrollable="true"
              className={`max-h-[55dvh] flex-1 overflow-auto rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-3 font-mono leading-relaxed text-[var(--app-text)] select-text ${fontSizeClass} ${
                wrapLines ? 'break-words whitespace-pre-wrap' : 'whitespace-pre'
              }`}
            >
              {state.kind === 'binary' && binaryMode === 'hex'
                ? state.hexDump
                : displayedText || t('viewer.empty')}
            </pre>
          )}

          <div className="flex items-center justify-between text-xs tabular-nums text-[var(--app-text-muted)]">
            <span>
              {search.trim()
                ? t('viewer.matches', {
                    shown: shownLines.toLocaleString(),
                    total: totalLines.toLocaleString(),
                  })
                : t('viewer.stats', {
                    lines: shownLines.toLocaleString(),
                    chars: displayedText.length.toLocaleString(),
                  })}
            </span>
            {state.truncated && (
              <span>{t('viewer.maxPreview', { size: formatBytes(MAX_TEXT_PREVIEW_BYTES) })}</span>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
