import { formatBytes } from '@revel/core'
import { useEffect, useMemo, useState } from 'react'
import type { HistoryEntry } from '../lib/historyStore'
import { downloadBlob } from '../lib/saveFile'
import { RecentFilesCard } from './RecentFilesCard'
import { CARD, SECONDARY_BUTTON, SUBTLE_BOX } from './styles'

/** Max bytes read into text/hex preview so giant files never freeze a phone. */
const MAX_TEXT_PREVIEW_BYTES = 1_500_000
const MAX_HEX_PREVIEW_BYTES = 4_096

type ViewerKind = 'text' | 'csv' | 'json' | 'image' | 'video' | 'audio' | 'pdf' | 'binary'

interface LoadedFileState {
  file: File
  kind: ViewerKind
  textContent: string
  truncated: boolean
  objectUrl: string | null
  pdfInfo: { pageCount: number; title?: string; author?: string; creator?: string } | null
  hexDump: string
  loading: boolean
  error: string | null
}

interface FileViewerProps {
  recentViewed: HistoryEntry[]
  onFileViewed: (file: File) => void
  onClearViewed: () => void
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

function getExtension(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : ''
}

function detectKind(file: File, sampleBytes: Uint8Array): ViewerKind {
  const ext = getExtension(file.name)
  const mime = file.type.toLowerCase()

  if (ext === 'json' || mime === 'application/json' || mime.endsWith('+json')) {
    return 'json'
  }
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
  if (mime === 'application/pdf' || ext === 'pdf') {
    return 'pdf'
  }

  // Heuristic: if the first bytes contain no null bytes, treat unknown files as readable text.
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

function parseDelimited(text: string, delimiter: string): string[][] {
  return text
    .split(/\r?\n/)
    .filter((line) => line.length > 0)
    .slice(0, 200)
    .map((line) => line.split(delimiter))
}

export function FileViewer({ recentViewed, onFileViewed, onClearViewed }: FileViewerProps) {
  const [dragging, setDragging] = useState(false)
  const [state, setState] = useState<LoadedFileState | null>(null)
  const [wrapLines, setWrapLines] = useState(true)
  const [fontSize, setFontSize] = useState<'xs' | 'sm' | 'base'>('xs')
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState(false)
  const [csvMode, setCsvMode] = useState<'table' | 'raw'>('table')
  const [binaryMode, setBinaryMode] = useState<'text' | 'hex'>('text')
  const [prettyJson, setPrettyJson] = useState(true)

  useEffect(() => {
    return () => {
      if (state?.objectUrl) {
        URL.revokeObjectURL(state.objectUrl)
      }
    }
  }, [state?.objectUrl])

  async function openFile(file: File, recordHistory = true) {
    if (state?.objectUrl) {
      URL.revokeObjectURL(state.objectUrl)
    }
    setSearch('')
    setCopied(false)
    setCsvMode('table')
    setBinaryMode('text')
    setPrettyJson(true)

    if (recordHistory) {
      onFileViewed(file)
    }

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
          objectUrl = URL.createObjectURL(converted)
        } else {
          objectUrl = URL.createObjectURL(file)
        }
      } else if (kind === 'video' || kind === 'audio') {
        objectUrl = URL.createObjectURL(file)
      } else if (kind === 'pdf') {
        objectUrl = URL.createObjectURL(file)
        try {
          const { PDFDocument } = await import('pdf-lib')
          const fullBuf = await file.arrayBuffer()
          const pdfDoc = await PDFDocument.load(fullBuf, { ignoreEncryption: true })
          pdfInfo = {
            pageCount: pdfDoc.getPageCount(),
            title: pdfDoc.getTitle(),
            author: pdfDoc.getAuthor(),
            creator: pdfDoc.getCreator(),
          }
        } catch {
          // Still allow viewing raw/embedded PDF if metadata parsing fails.
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
        error: err instanceof Error ? err.message : 'Could not read this file.',
      })
    }
  }

  function handleOpenFromHistory(entry: HistoryEntry) {
    const file = new File([entry.blob], entry.fileName, {
      type: entry.mimeType || entry.blob.type,
    })
    void openFile(file, true)
  }

  const displayedText = useMemo(() => {
    if (!state) return ''
    let content = state.textContent
    if (state.kind === 'json' && prettyJson) {
      try {
        content = JSON.stringify(JSON.parse(content), null, 2)
      } catch {
        // Keep raw text if JSON is invalid or truncated.
      }
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      return content
        .split(/\r?\n/)
        .filter((line) => line.toLowerCase().includes(q))
        .join('\n')
    }
    return content
  }, [state, prettyJson, search])

  const lineCount = useMemo(() => {
    if (!displayedText) return 0
    return displayedText.split(/\r?\n/).length
  }, [displayedText])

  async function handleCopy() {
    if (!displayedText) return
    try {
      await navigator.clipboard.writeText(displayedText)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Ignore clipboard permission errors.
    }
  }

  if (!state) {
    return (
      <div className="flex flex-1 flex-col gap-3.5">
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
          className={`flex flex-1 cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed px-5 py-10 text-center transition active:scale-[0.99] focus-within:ring-2 focus-within:ring-emerald-500 ${
            dragging
              ? 'border-emerald-500 bg-emerald-500/10'
              : 'border-[var(--app-border)] bg-[var(--app-card)]'
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
          <span className="flex size-16 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-500">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-8"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
            </svg>
          </span>
          <div className="space-y-1">
            <span className="block text-lg font-bold tracking-tight">Tap to view any file</span>
            <span className="block text-xs text-slate-500 dark:text-slate-400">
              Open .txt, .json, .csv, .log, code, HEIC photos, PDFs or unknown files directly on
              your phone
            </span>
          </div>

          <span className="mt-1 inline-flex items-center rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs">
            Open file to read
          </span>
        </label>

        <RecentFilesCard
          title="Recent Viewed Files"
          entries={recentViewed}
          onOpen={handleOpenFromHistory}
          onClear={onClearViewed}
        />
      </div>
    )
  }

  const fontSizeClass =
    fontSize === 'xs' ? 'text-xs' : fontSize === 'sm' ? 'text-sm' : 'text-base'

  return (
    <section className={`${CARD} flex flex-1 flex-col gap-3.5 overflow-hidden`}>
      <div className={`${SUBTLE_BOX} flex items-center justify-between gap-2.5 px-3.5 py-2.5`}>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{state.file.name}</p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            {(getExtension(state.file.name) || state.kind).toUpperCase()} ·{' '}
            {formatBytes(state.file.size)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => downloadBlob(state.file, state.file.name)}
            className="rounded-xl bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white active:scale-95"
          >
            Download
          </button>
          <button
            type="button"
            onClick={() => setState(null)}
            className="text-xs font-semibold text-emerald-500 active:opacity-70"
          >
            Change
          </button>
        </div>
      </div>

      {state.loading ? (
        <div className="my-auto py-12 text-center text-sm text-slate-500 dark:text-slate-400">
          Reading file…
        </div>
      ) : state.error ? (
        <div className="rounded-2xl border border-red-300 bg-red-50 px-3.5 py-3 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
          {state.error}
        </div>
      ) : state.kind === 'image' && state.objectUrl ? (
        <div className={`${SUBTLE_BOX} flex flex-1 flex-col items-center justify-center gap-3 overflow-auto p-3`}>
          <img
            src={state.objectUrl}
            alt={state.file.name}
            className="max-h-[55dvh] w-auto rounded-xl object-contain"
          />
        </div>
      ) : state.kind === 'video' && state.objectUrl ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-2xl bg-black p-2">
          <video
            src={state.objectUrl}
            controls
            playsInline
            className="max-h-[55dvh] w-full rounded-xl"
          />
        </div>
      ) : state.kind === 'audio' && state.objectUrl ? (
        <div className="my-auto flex flex-col items-center gap-4 py-8">
          <audio src={state.objectUrl} controls className="w-full" />
        </div>
      ) : state.kind === 'pdf' ? (
        <div className="flex flex-1 flex-col gap-3">
          {state.pdfInfo && (
            <div className={`${SUBTLE_BOX} grid grid-cols-2 gap-2 p-3 text-xs`}>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Pages:</span>{' '}
                <strong className="font-semibold">{state.pdfInfo.pageCount}</strong>
              </div>
              {state.pdfInfo.title && (
                <div className="truncate">
                  <span className="text-slate-500 dark:text-slate-400">Title:</span>{' '}
                  <strong className="font-semibold">{state.pdfInfo.title}</strong>
                </div>
              )}
              {state.pdfInfo.author && (
                <div className="truncate">
                  <span className="text-slate-500 dark:text-slate-400">Author:</span>{' '}
                  <strong className="font-semibold">{state.pdfInfo.author}</strong>
                </div>
              )}
            </div>
          )}
          {state.objectUrl && (
            <iframe
              src={state.objectUrl}
              title={state.file.name}
              className="min-h-[46dvh] w-full flex-1 rounded-2xl border border-[var(--app-border)] bg-white"
            />
          )}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2.5">
          {/* Viewer toolbar for text / csv / json / binary */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {state.kind === 'csv' && (
                <button
                  type="button"
                  onClick={() => setCsvMode(csvMode === 'table' ? 'raw' : 'table')}
                  className="rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-2.5 py-1 text-xs font-medium"
                >
                  {csvMode === 'table' ? 'Raw text' : 'Table view'}
                </button>
              )}
              {state.kind === 'json' && (
                <button
                  type="button"
                  onClick={() => setPrettyJson(!prettyJson)}
                  className="rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-2.5 py-1 text-xs font-medium"
                >
                  {prettyJson ? 'Minified' : 'Format JSON'}
                </button>
              )}
              {state.kind === 'binary' && (
                <button
                  type="button"
                  onClick={() => setBinaryMode(binaryMode === 'text' ? 'hex' : 'text')}
                  className="rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-2.5 py-1 text-xs font-medium"
                >
                  {binaryMode === 'text' ? 'Hex view' : 'Text view'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setWrapLines(!wrapLines)}
                className="rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-2.5 py-1 text-xs font-medium"
              >
                {wrapLines ? 'No wrap' : 'Wrap'}
              </button>
              <button
                type="button"
                onClick={() =>
                  setFontSize(fontSize === 'xs' ? 'sm' : fontSize === 'sm' ? 'base' : 'xs')
                }
                className="rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-2.5 py-1 text-xs font-medium"
              >
                Text size
              </button>
            </div>

            <button
              type="button"
              onClick={() => void handleCopy()}
              className="rounded-xl bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-500"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          <input
            type="search"
            placeholder="Filter lines in file…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 py-2 text-xs"
          />

          {state.kind === 'csv' && csvMode === 'table' ? (
            <div className="max-h-[48dvh] flex-1 overflow-auto rounded-2xl border border-[var(--app-border)]">
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
                          ? 'bg-[var(--app-subtle)] font-semibold'
                          : 'border-t border-[var(--app-border)]'
                      }
                    >
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-2.5 py-1.5 whitespace-nowrap">
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
              className={`max-h-[48dvh] flex-1 overflow-auto rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3 font-mono leading-relaxed select-text ${fontSizeClass} ${
                wrapLines ? 'break-words whitespace-pre-wrap' : 'whitespace-pre'
              }`}
            >
              {state.kind === 'binary' && binaryMode === 'hex'
                ? state.hexDump
                : displayedText || '(Empty file)'}
            </pre>
          )}

          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>
              {lineCount.toLocaleString()} {lineCount === 1 ? 'line' : 'lines'} ·{' '}
              {displayedText.length.toLocaleString()} chars
            </span>
            {state.truncated && (
              <span>Showing first {formatBytes(MAX_TEXT_PREVIEW_BYTES)}</span>
            )}
          </div>
        </div>
      )}

      <button type="button" onClick={() => setState(null)} className={SECONDARY_BUTTON}>
        Open another file
      </button>
    </section>
  )
}
