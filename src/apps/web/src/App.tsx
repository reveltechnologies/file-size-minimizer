import {
  calculateBitrate,
  DEFAULT_AUDIO_KBPS,
  formatBytes,
  isJpegFile,
  offersPngOutput,
  type CompressOptions,
  type FileCategory,
  type ImageFormat,
} from '@revel/core'
import { useEffect, useRef, useState } from 'react'
import { DropZone } from './components/DropZone'
import { FileViewer } from './components/FileViewer'
import { ImageFormatPicker } from './components/ImageFormatPicker'
import { OptionToggles } from './components/OptionToggles'
import { ProgressPanel } from './components/ProgressPanel'
import { RecentFilesCard } from './components/RecentFilesCard'
import { SavingsReceipt } from './components/SavingsReceipt'
import { SettingsPanel } from './components/SettingsPanel'
import { CARD, PRIMARY_BUTTON, SECONDARY_BUTTON, SUBTLE_BOX } from './components/styles'
import { TargetPicker } from './components/TargetPicker'
import { VideoPlanNote } from './components/VideoPlanNote'
import { BlurryVideoError, compress, type CompressResult, type ProgressStep } from './engines'
import {
  addHistoryEntry,
  clearHistory,
  listHistory,
  type HistoryEntry,
} from './lib/historyStore'
import { pickFiles, type PickedFiles } from './lib/pickFiles'
import {
  loadSettings,
  saveSettings,
  THEMES,
  type AppSettings,
} from './lib/settingsStore'
import { defaultTarget, targetBytes, type Target } from './lib/target'
import { useTransparency } from './lib/useTransparency'
import { useVideoInfo } from './lib/useVideoInfo'

type Scene = 'viewer' | 'shrink' | 'settings'

const SCENES: { id: Scene; label: string; subtitle: string }[] = [
  { id: 'viewer', label: 'View File', subtitle: 'Read .txt, logs, CSV, JSON, media & more' },
  { id: 'shrink', label: 'Shrink File', subtitle: '100% on-device · Private & offline-ready' },
  { id: 'settings', label: 'Settings', subtitle: 'Themes, history & default options' },
]

const CATEGORY_LABEL: Record<FileCategory, string> = {
  video: 'Video',
  image: 'Photo',
  pdf: 'PDF',
}

const WORKING_TITLE: Record<FileCategory, string> = {
  video: 'Shrinking your video…',
  image: 'Shrinking your photo…',
  pdf: 'Shrinking your PDF…',
}

/** Long enough to see the bar fill and "Done" tick before the receipt appears. */
const DONE_PAUSE_MS = 700

function App() {
  const [scene, setScene] = useState<Scene>('shrink')
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings())
  const [picked, setPicked] = useState<PickedFiles | null>(null)
  const [target, setTarget] = useState<Target>(() => defaultTarget('video'))
  const [options, setOptions] = useState<CompressOptions>(() => loadSettings().options)
  const [progress, setProgress] = useState<number | null>(null)
  const [step, setStep] = useState<ProgressStep>('prepare')
  const [status, setStatus] = useState('')
  const [result, setResult] = useState<CompressResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [allowBlurry, setAllowBlurry] = useState(false)
  /** The engine found the video would be blurry, which the browser couldn't tell in advance. */
  const [offerBlurry, setOfferBlurry] = useState(false)
  /** The user's pick; until then the format follows settings or whether the image is see-through. */
  const [formatOverride, setFormatOverride] = useState<ImageFormat | null>(null)
  const [viewedHistory, setViewedHistory] = useState<HistoryEntry[]>([])
  const [shrunkHistory, setShrunkHistory] = useState<HistoryEntry[]>([])
  const abortRef = useRef<AbortController | null>(null)
  const barTrackRef = useRef<HTMLDivElement | null>(null)
  const draggingBarRef = useRef(false)

  useEffect(() => {
    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (mode: string) => Promise<void>
    }
    orientation?.lock?.('portrait')?.catch(() => {
      // Orientation lock is enforced by the manifest/TWA or CSS overlay when unsupported in browser tabs.
    })
  }, [])

  // Apply theme & persist settings across app restarts.
  useEffect(() => {
    const themeMeta = THEMES.find((t) => t.id === settings.theme) ?? THEMES[0]
    document.documentElement.dataset.theme = themeMeta.id
    document.documentElement.classList.toggle('dark', themeMeta.isDark)
    saveSettings(settings)
  }, [settings])

  // Load saved file history on startup.
  useEffect(() => {
    if (!settings.rememberHistory) return
    void listHistory('viewed').then(setViewedHistory)
    void listHistory('shrunk').then(setShrunkHistory)
  }, [settings.rememberHistory])

  const sceneIndex = SCENES.findIndex((s) => s.id === scene)
  const activeSceneMeta = SCENES[sceneIndex]

  const videoInfo = useVideoInfo(picked?.category === 'video' ? picked.files[0] : null)
  const photo = picked?.category === 'image' ? picked.files[0] : null
  const pngOffered = photo ? offersPngOutput(photo.name, photo.type) : false
  const transparent = useTransparency(pngOffered ? photo : null)
  const fallbackFormat: ImageFormat =
    settings.defaultPhotoFormat === 'auto'
      ? transparent
        ? 'png'
        : 'jpeg'
      : settings.defaultPhotoFormat
  const imageFormat: ImageFormat = formatOverride ?? fallbackFormat
  const isMerge = (picked?.files.length ?? 0) > 1
  const totalBytes = picked?.files.reduce((sum, file) => sum + file.size, 0) ?? 0
  const maxBytes = picked ? targetBytes(target, picked.category) : null
  const videoPlan =
    videoInfo && maxBytes !== null
      ? calculateBitrate({
          maxBytes,
          durationSec: videoInfo.durationSec,
          audioKbps: options.muteAudio ? 0 : DEFAULT_AUDIO_KBPS,
        })
      : null
  const canShrink =
    maxBytes !== null &&
    (!videoPlan || (videoPlan.possible && (videoPlan.feasible || allowBlurry))) &&
    // Wait for the transparency check, or the default format could still flip.
    (!pngOffered || settings.defaultPhotoFormat !== 'auto' || transparent !== null)

  function handleChangeSettings(next: AppSettings) {
    setSettings(next)
    setOptions(next.options)
    if (!next.rememberHistory) {
      setViewedHistory([])
      setShrunkHistory([])
      void clearHistory()
    }
  }

  function handleFileViewed(file: File) {
    if (!settings.rememberHistory) return
    void addHistoryEntry({
      bucket: 'viewed',
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
      blob: file,
    }).then(setViewedHistory)
  }

  function handleFiles(files: File[]) {
    const pick = pickFiles(files)
    setResult(null)
    setAllowBlurry(false)
    setOfferBlurry(false)
    setFormatOverride(null)
    setOptions(settings.options)
    if (typeof pick === 'string') {
      setPicked(null)
      setError(pick)
      return
    }
    setError(null)
    setPicked(pick)
    setTarget(defaultTarget(pick.category))
  }

  async function handleShrink(forceBlurry = false) {
    if (!picked || maxBytes === null) return
    const controller = new AbortController()
    abortRef.current = controller
    setError(null)
    setOfferBlurry(false)
    setStatus('')
    setStep('prepare')
    setProgress(0)
    try {
      const done = await compress({
        ...picked,
        maxBytes,
        options,
        allowBlurry: allowBlurry || forceBlurry,
        imageFormat,
        onStep: setStep,
        onProgress: setProgress,
        onStatus: setStatus,
        signal: controller.signal,
      })
      if (settings.rememberHistory) {
        const updated = await addHistoryEntry({
          bucket: 'shrunk',
          fileName: done.fileName,
          mimeType: done.blob.type,
          size: done.blob.size,
          originalSize: totalBytes,
          blob: done.blob,
        })
        setShrunkHistory(updated)
      }
      setStep('done')
      await new Promise((resolve) => setTimeout(resolve, DONE_PAUSE_MS))
      setResult(done)
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : 'Something went wrong while shrinking.')
        setOfferBlurry(err instanceof BlurryVideoError)
      }
    } finally {
      abortRef.current = null
      setProgress(null)
    }
  }

  function reset() {
    setPicked(null)
    setResult(null)
    setError(null)
  }

  function updateSceneFromPointer(clientX: number) {
    const track = barTrackRef.current
    if (!track) return
    const rect = track.getBoundingClientRect()
    if (rect.width <= 0) return
    const ratio = Math.max(0, Math.min(0.999, (clientX - rect.left) / rect.width))
    const idx = Math.floor(ratio * SCENES.length)
    setScene(SCENES[idx].id)
  }

  return (
    <div className="min-h-dvh bg-[var(--app-outer)] text-slate-900 dark:text-slate-100">
      {/* Portrait-only lock overlay when a physical phone is rotated horizontally */}
      <div
        aria-hidden="true"
        className="portrait-lock-overlay fixed inset-0 z-50 hidden flex-col items-center justify-center gap-3 bg-black px-6 text-center text-white"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-12 text-emerald-400"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="6" y="2" width="12" height="20" rx="2" />
          <path d="M12 18h.01" />
        </svg>
        <p className="text-lg font-bold">Portrait Mode Only</p>
        <p className="max-w-xs text-xs text-slate-400">
          Please rotate your phone upright. This app is locked to vertical portrait orientation.
        </p>
      </div>

      {/* Vertical phone shell constrained for every phone screen */}
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-[var(--app-shell)] shadow-xl">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[var(--app-border)] bg-[var(--app-shell)]/90 px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3 backdrop-blur-md">
          <div className="flex min-w-0 items-center gap-2.5">
            <img src="/logo.png" alt="" className="size-9 shrink-0 object-contain" />
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold tracking-tight">
                {activeSceneMeta.label}
              </h1>
              <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                {activeSceneMeta.subtitle}
              </p>
            </div>
          </div>

          {scene === 'shrink' && picked && progress === null && (
            <button
              type="button"
              onClick={reset}
              className="shrink-0 rounded-full border border-[var(--app-border)] bg-[var(--app-subtle)] px-3 py-1.5 text-xs font-semibold active:scale-95"
            >
              Start over
            </button>
          )}
        </header>

        <main className="flex flex-1 flex-col gap-3.5 px-4 pt-3.5 pb-2">
          {scene === 'viewer' ? (
            <FileViewer
              recentViewed={settings.rememberHistory ? viewedHistory : []}
              onFileViewed={handleFileViewed}
              onClearViewed={() => {
                setViewedHistory([])
                void clearHistory('viewed')
              }}
            />
          ) : scene === 'settings' ? (
            <SettingsPanel
              settings={settings}
              onChangeSettings={handleChangeSettings}
              storedHistoryCount={viewedHistory.length + shrunkHistory.length}
              onClearAllHistory={() => {
                setViewedHistory([])
                setShrunkHistory([])
                void clearHistory()
              }}
            />
          ) : (
            <>
              {error && (
                <div
                  role="alert"
                  className="flex flex-col gap-2.5 rounded-2xl border border-red-300 bg-red-50 px-3.5 py-3 text-xs leading-relaxed text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200"
                >
                  <p>{error}</p>
                  {offerBlurry && picked && progress === null && (
                    <button
                      type="button"
                      onClick={() => void handleShrink(true)}
                      className={SECONDARY_BUTTON}
                    >
                      Shrink anyway (blurry)
                    </button>
                  )}
                </div>
              )}

              {picked && result && maxBytes !== null ? (
                <SavingsReceipt
                  originalBytes={totalBytes}
                  maxBytes={maxBytes}
                  result={result}
                  onReset={reset}
                />
              ) : picked && progress !== null ? (
                <ProgressPanel
                  title={isMerge ? 'Making your PDF…' : WORKING_TITLE[picked.category]}
                  step={step}
                  ratio={progress}
                  status={status}
                  onCancel={() => abortRef.current?.abort()}
                />
              ) : picked ? (
                <div className="flex flex-1 flex-col justify-between gap-3.5">
                  <section className={`${CARD} flex flex-col gap-4`}>
                    <div className="flex flex-col gap-2">
                      <div className={`${SUBTLE_BOX} flex items-center justify-between gap-3 px-3.5 py-2.5`}>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {isMerge ? `${picked.files.length} photos → 1 PDF` : picked.files[0].name}
                          </p>
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                            {isMerge ? 'Photos' : CATEGORY_LABEL[picked.category]} ·{' '}
                            {formatBytes(totalBytes)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={reset}
                          className="shrink-0 text-xs font-semibold text-emerald-500 active:opacity-70"
                        >
                          Change
                        </button>
                      </div>
                      {isMerge && (
                        <div className="text-xs text-slate-600 dark:text-slate-400">
                          <p>Pages in this order (rename files to change it):</p>
                          <ol className="mt-1.5 max-h-32 list-inside list-decimal overflow-y-auto rounded-xl border border-[var(--app-border)] px-3 py-2">
                            {picked.files.map((file, i) => (
                              <li key={i} className="truncate py-0.5">
                                {file.name}
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </div>

                    <TargetPicker category={picked.category} target={target} onChange={setTarget} />
                    {pngOffered ? (
                      <ImageFormatPicker
                        format={imageFormat}
                        transparent={transparent}
                        onChange={setFormatOverride}
                      />
                    ) : (
                      photo &&
                      !isJpegFile(photo.name, photo.type) && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Will be saved as JPG, which works everywhere.
                        </p>
                      )
                    )}
                    {isMerge ? (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        GPS location and camera data are always removed when combining photos.
                      </p>
                    ) : (
                      <OptionToggles
                        category={picked.category}
                        options={options}
                        onChange={setOptions}
                      />
                    )}

                    {videoInfo && videoPlan && maxBytes !== null && (
                      <VideoPlanNote
                        info={videoInfo}
                        plan={videoPlan}
                        maxBytes={maxBytes}
                        smartOptimize={options.smartOptimize}
                        allowBlurry={allowBlurry}
                        onAllowBlurryChange={setAllowBlurry}
                      />
                    )}
                    {!isMerge && maxBytes !== null && totalBytes <= maxBytes && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Already under {formatBytes(maxBytes)}. Shrinking will still strip hidden
                        data.
                      </p>
                    )}
                  </section>

                  <button
                    type="button"
                    disabled={!canShrink}
                    onClick={() => void handleShrink()}
                    className={PRIMARY_BUTTON}
                  >
                    {maxBytes === null
                      ? 'Enter a size limit'
                      : `${isMerge ? 'Combine' : 'Shrink'} under ${formatBytes(maxBytes)}`}
                  </button>
                </div>
              ) : (
                <div className="flex flex-1 flex-col gap-3.5">
                  <DropZone onFiles={handleFiles} />
                  {settings.rememberHistory && (
                    <RecentFilesCard
                      title="Recent Shrunk Files"
                      entries={shrunkHistory}
                      onClear={() => {
                        setShrunkHistory([])
                        void clearHistory('shrunk')
                      }}
                    />
                  )}
                </div>
              )}
            </>
          )}
        </main>

        {/* Bottom slide/scroll navigation bar: Left = View File, Center = Shrink File, Right = Settings */}
        <nav
          aria-label="App scenes"
          className="sticky bottom-0 z-10 border-t border-[var(--app-border)] bg-[var(--app-shell)]/95 px-4 pt-2 pb-[max(env(safe-area-inset-bottom),0.75rem)] backdrop-blur-md"
        >
          <div
            ref={barTrackRef}
            onPointerDown={(event) => {
              draggingBarRef.current = true
              event.currentTarget.setPointerCapture(event.pointerId)
              updateSceneFromPointer(event.clientX)
            }}
            onPointerMove={(event) => {
              if (!draggingBarRef.current) return
              updateSceneFromPointer(event.clientX)
            }}
            onPointerUp={() => {
              draggingBarRef.current = false
            }}
            onPointerCancel={() => {
              draggingBarRef.current = false
            }}
            className="relative grid touch-none grid-cols-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] p-1 select-none"
          >
            {/* Sliding active pill */}
            <span
              aria-hidden="true"
              style={{ transform: `translateX(${sceneIndex * 100}%)` }}
              className="pointer-events-none absolute top-1 bottom-1 left-1 w-[calc((100%-0.5rem)/3)] rounded-xl bg-emerald-600 shadow-sm transition-transform duration-200 ease-out"
            />

            {SCENES.map((item) => {
              const active = scene === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setScene(item.id)}
                  className={`relative z-10 flex items-center justify-center rounded-xl py-2.5 text-xs font-semibold transition-colors ${
                    active ? 'text-white' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <span>{item.label}</span>
                </button>
              )
            })}
          </div>
        </nav>
      </div>
    </div>
  )
}

export default App
