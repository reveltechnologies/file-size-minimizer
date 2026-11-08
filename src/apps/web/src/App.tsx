import {
  calculateBitrate,
  DEFAULT_AUDIO_KBPS,
  formatBytes,
  offersPngOutput,
  type CompressOptions,
  type FileCategory,
  type ImageFormat,
} from '@revel/core'
import { useEffect, useMemo, useRef, useState } from 'react'
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
import { I18nContext, translate, type TranslationKey } from './lib/i18n'
import { pickFiles, type PickedFiles } from './lib/pickFiles'
import {
  applyNaming,
  loadSettings,
  saveSettings,
  THEMES,
  type AppSettings,
} from './lib/settingsStore'
import { defaultTarget, targetBytes, type Target } from './lib/target'
import { useTransparency } from './lib/useTransparency'
import { useVideoInfo } from './lib/useVideoInfo'

type Scene = 'viewer' | 'shrink' | 'settings'

const SCENES: { id: Scene; labelKey: TranslationKey }[] = [
  { id: 'viewer', labelKey: 'scene.viewer' },
  { id: 'shrink', labelKey: 'scene.shrink' },
  { id: 'settings', labelKey: 'scene.settings' },
]

const CATEGORY_KEY: Record<FileCategory, TranslationKey> = {
  video: 'category.video',
  image: 'category.image',
  pdf: 'category.pdf',
}

const WORKING_KEY: Record<FileCategory, TranslationKey> = {
  video: 'shrink.workingVideo',
  image: 'shrink.workingImage',
  pdf: 'shrink.workingPdf',
}

const DONE_PAUSE_MS = 700

function isInteractiveElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(
    target.closest('input, select, textarea, a, [data-no-swipe="true"]'),
  )
}

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
  const [offerBlurry, setOfferBlurry] = useState(false)
  const [formatOverride, setFormatOverride] = useState<ImageFormat | null>(null)
  const [viewedHistory, setViewedHistory] = useState<HistoryEntry[]>([])
  const [shrunkHistory, setShrunkHistory] = useState<HistoryEntry[]>([])
  const abortRef = useRef<AbortController | null>(null)
  const barTrackRef = useRef<HTMLDivElement | null>(null)
  const mainRef = useRef<HTMLElement | null>(null)
  const draggingBarRef = useRef(false)
  const gestureRef = useRef<{
    startX: number
    startY: number
    startScrollTop: number
    active: boolean
    axis: 'none' | 'x' | 'y'
  }>({
    startX: 0,
    startY: 0,
    startScrollTop: 0,
    active: false,
    axis: 'none',
  })

  const i18nValue = useMemo(
    () => ({
      locale: settings.language,
      t: (key: TranslationKey, vars?: Record<string, string | number>) =>
        translate(settings.language, key, vars),
    }),
    [settings.language],
  )
  const { t } = i18nValue

  useEffect(() => {
    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (mode: string) => Promise<void>
    }
    orientation?.lock?.('portrait')?.catch(() => {})
  }, [])

  useEffect(() => {
    const themeMeta = THEMES.find((item) => item.id === settings.theme) ?? THEMES[0]
    document.documentElement.dataset.theme = themeMeta.id
    document.documentElement.classList.toggle('dark', themeMeta.isDark)
    document.documentElement.lang = settings.language.split('_')[0] || 'en'
    saveSettings(settings)
  }, [settings])

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
      const rawDone = await compress({
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
      const sourceBaseName = isMerge ? 'photos.pdf' : picked.files[0].name
      const finalFileName = applyNaming(
        sourceBaseName,
        rawDone.fileName,
        settings.filePrefix,
        settings.fileSuffix,
      )
      const done: CompressResult = {
        ...rawDone,
        fileName: finalFileName,
      }
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
        setError(err instanceof Error ? err.message : 'Shrink failed.')
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
    <I18nContext value={i18nValue}>
      <div className="h-dvh overflow-hidden bg-[var(--app-outer)] text-slate-900 dark:text-slate-100">
        <div
          aria-hidden="true"
          className="portrait-lock-overlay fixed inset-0 z-50 hidden flex-col items-center justify-center gap-2 bg-black px-6 text-center text-white"
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
          <p className="text-base font-bold">{t('common.portraitOnly')}</p>
        </div>

        <div className="mx-auto flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-[var(--app-shell)] shadow-xl">
          <header className="z-10 flex shrink-0 items-center justify-between gap-3 border-b border-[var(--app-border)] bg-[var(--app-shell)] px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <img src="/logo.png" alt="" className="size-8 shrink-0 object-contain" />
              <h1 className="truncate text-base font-bold tracking-tight">
                {t(activeSceneMeta.labelKey)}
              </h1>
            </div>

            {scene === 'shrink' && picked && progress === null && (
              <button
                type="button"
                onClick={reset}
                aria-label={t('common.reset')}
                title={t('common.reset')}
                className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] active:scale-95"
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
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </header>

          <main
            ref={mainRef}
            onPointerDown={(event) => {
              if (isInteractiveElement(event.target)) return
              gestureRef.current = {
                startX: event.clientX,
                startY: event.clientY,
                startScrollTop: mainRef.current?.scrollTop ?? 0,
                active: true,
                axis: 'none',
              }
            }}
            onPointerMove={(event) => {
              const g = gestureRef.current
              if (!g.active) return
              const dx = event.clientX - g.startX
              const dy = event.clientY - g.startY
              if (g.axis === 'none') {
                if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
                  g.axis = Math.abs(dx) > Math.abs(dy) * 1.25 ? 'x' : 'y'
                }
              }
              if (g.axis === 'y' && mainRef.current && event.pointerType === 'mouse') {
                mainRef.current.scrollTop = g.startScrollTop - dy
              }
            }}
            onPointerUp={(event) => {
              const g = gestureRef.current
              if (!g.active) return
              g.active = false
              const dx = event.clientX - g.startX
              const dy = event.clientY - g.startY
              if (g.axis === 'x' && Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.25) {
                if (dx < 0 && sceneIndex < SCENES.length - 1) {
                  setScene(SCENES[sceneIndex + 1].id)
                } else if (dx > 0 && sceneIndex > 0) {
                  setScene(SCENES[sceneIndex - 1].id)
                }
              }
            }}
            onPointerCancel={() => {
              gestureRef.current.active = false
            }}
            className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-3"
          >
            {scene === 'viewer' ? (
              <FileViewer
                recentViewed={settings.rememberHistory ? viewedHistory : []}
                outputLocationMode={settings.outputLocationMode}
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
                    className="flex flex-col gap-2 rounded-2xl border border-red-300 bg-red-50 px-3.5 py-2.5 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200"
                  >
                    <p>{error}</p>
                    {offerBlurry && picked && progress === null && (
                      <button
                        type="button"
                        onClick={() => void handleShrink(true)}
                        className={SECONDARY_BUTTON}
                      >
                        {t('shrink.shrinkAnyway')}
                      </button>
                    )}
                  </div>
                )}

                {picked && result && maxBytes !== null ? (
                  <SavingsReceipt
                    originalBytes={totalBytes}
                    maxBytes={maxBytes}
                    result={result}
                    outputLocationMode={settings.outputLocationMode}
                    onReset={reset}
                  />
                ) : picked && progress !== null ? (
                  <ProgressPanel
                    title={isMerge ? t('shrink.buildingPdf') : t(WORKING_KEY[picked.category])}
                    step={step}
                    ratio={progress}
                    status={status}
                    onCancel={() => abortRef.current?.abort()}
                  />
                ) : picked ? (
                  <div className="flex flex-1 flex-col justify-between gap-3">
                    <section className={`${CARD} flex flex-col gap-3.5`}>
                      <div className="flex flex-col gap-2">
                        <div className={`${SUBTLE_BOX} flex items-center justify-between gap-2 px-3 py-2`}>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold">
                              {isMerge
                                ? t('shrink.photosToPdf', { count: picked.files.length })
                                : picked.files[0].name}
                            </p>
                            <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                              {isMerge ? t('category.photos') : t(CATEGORY_KEY[picked.category])} ·{' '}
                              {formatBytes(totalBytes)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={reset}
                            aria-label={t('common.close')}
                            className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-[var(--app-border)] active:scale-95"
                          >
                            <svg
                              aria-hidden="true"
                              viewBox="0 0 24 24"
                              className="size-3.5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M18 6 6 18M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        {isMerge && (
                          <ol className="max-h-28 list-inside list-decimal overflow-y-auto rounded-xl border border-[var(--app-border)] px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400">
                            {picked.files.map((file, i) => (
                              <li key={i} className="truncate py-0.5">
                                {file.name}
                              </li>
                            ))}
                          </ol>
                        )}
                      </div>

                      <TargetPicker category={picked.category} target={target} onChange={setTarget} />
                      {pngOffered && (
                        <ImageFormatPicker
                          format={imageFormat}
                          transparent={transparent}
                          onChange={setFormatOverride}
                        />
                      )}
                      {!isMerge && (
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
                    </section>

                    <button
                      type="button"
                      disabled={!canShrink}
                      onClick={() => void handleShrink()}
                      className={PRIMARY_BUTTON}
                    >
                      {maxBytes === null
                        ? t('shrink.setLimit')
                        : isMerge
                          ? t('shrink.combineUnder', { size: formatBytes(maxBytes) })
                          : t('shrink.shrinkUnder', { size: formatBytes(maxBytes) })}
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-1 flex-col gap-3">
                    <DropZone onFiles={handleFiles} />
                    {settings.rememberHistory && (
                      <RecentFilesCard
                        title={t('common.recent')}
                        entries={shrunkHistory}
                        outputLocationMode={settings.outputLocationMode}
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

          <nav
            aria-label="App scenes"
            className="z-10 shrink-0 border-t border-[var(--app-border)] bg-[var(--app-shell)] px-4 pt-2 pb-[max(env(safe-area-inset-bottom),0.75rem)]"
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
                    <span>{t(item.labelKey)}</span>
                  </button>
                )
              })}
            </div>
          </nav>
        </div>
      </div>
    </I18nContext>
  )
}

export default App
