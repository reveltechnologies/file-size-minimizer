import {
  calculateBitrate,
  DEFAULT_AUDIO_KBPS,
  DEFAULT_OPTIONS,
  formatBytes,
  isJpegFile,
  offersPngOutput,
  type CompressOptions,
  type FileCategory,
  type ImageFormat,
} from '@revel/core'
import { useEffect, useRef, useState } from 'react'
import { DropZone } from './components/DropZone'
import { ImageFormatPicker } from './components/ImageFormatPicker'
import { OptionToggles } from './components/OptionToggles'
import { ProgressPanel } from './components/ProgressPanel'
import { SavingsReceipt } from './components/SavingsReceipt'
import { CARD, PRIMARY_BUTTON, SECONDARY_BUTTON } from './components/styles'
import { TargetPicker } from './components/TargetPicker'
import { VideoPlanNote } from './components/VideoPlanNote'
import { BlurryVideoError, compress, type CompressResult, type ProgressStep } from './engines'
import { pickFiles, type PickedFiles } from './lib/pickFiles'
import { defaultTarget, targetBytes, type Target } from './lib/target'
import { useTransparency } from './lib/useTransparency'
import { useVideoInfo } from './lib/useVideoInfo'

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
  const [picked, setPicked] = useState<PickedFiles | null>(null)
  const [target, setTarget] = useState<Target>(() => defaultTarget('video'))
  const [options, setOptions] = useState<CompressOptions>(DEFAULT_OPTIONS)
  const [progress, setProgress] = useState<number | null>(null)
  const [step, setStep] = useState<ProgressStep>('prepare')
  const [status, setStatus] = useState('')
  const [result, setResult] = useState<CompressResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [allowBlurry, setAllowBlurry] = useState(false)
  /** The engine found the video would be blurry, which the browser couldn't tell in advance. */
  const [offerBlurry, setOfferBlurry] = useState(false)
  /** The user's pick; until then the format follows whether the image is see-through. */
  const [formatOverride, setFormatOverride] = useState<ImageFormat | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (mode: string) => Promise<void>
    }
    orientation?.lock?.('portrait')?.catch(() => {
      // Orientation lock is enforced by the manifest/TWA or CSS overlay when unsupported in browser tabs.
    })
  }, [])

  const videoInfo = useVideoInfo(picked?.category === 'video' ? picked.files[0] : null)
  const photo = picked?.category === 'image' ? picked.files[0] : null
  const pngOffered = photo ? offersPngOutput(photo.name, photo.type) : false
  const transparent = useTransparency(pngOffered ? photo : null)
  const imageFormat: ImageFormat = formatOverride ?? (transparent ? 'png' : 'jpeg')
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
    (!pngOffered || transparent !== null)

  function handleFiles(files: File[]) {
    const pick = pickFiles(files)
    setResult(null)
    setAllowBlurry(false)
    setOfferBlurry(false)
    setFormatOverride(null)
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

  return (
    <div className="min-h-dvh bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Portrait-only lock overlay when a physical phone is rotated horizontally */}
      <div
        aria-hidden="true"
        className="portrait-lock-overlay fixed inset-0 z-50 hidden flex-col items-center justify-center gap-3 bg-slate-950 px-6 text-center text-white"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-12 text-blue-400"
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
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-slate-50 shadow-xl dark:bg-slate-950">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/90 px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/90">
          <div className="flex min-w-0 items-center gap-2.5">
            <img
              src="/logo.png"
              alt=""
              className="size-9 shrink-0 object-contain"
            />
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold tracking-tight">File Shrinker</h1>
              <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                100% on-device · Private &amp; offline-ready
              </p>
            </div>
          </div>

          {picked && progress === null && (
            <button
              type="button"
              onClick={reset}
              className="shrink-0 rounded-full bg-slate-200/70 px-3 py-1.5 text-xs font-semibold text-slate-700 active:scale-95 dark:bg-slate-800 dark:text-slate-200"
            >
              Start over
            </button>
          )}
        </header>

        <main className="flex flex-1 flex-col gap-3.5 px-4 pt-3.5 pb-[max(env(safe-area-inset-bottom),1rem)]">
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
                  <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-100/80 px-3.5 py-2.5 dark:bg-slate-800/60">
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
                      className="shrink-0 text-xs font-semibold text-blue-600 active:opacity-70 dark:text-blue-400"
                    >
                      Change
                    </button>
                  </div>
                  {isMerge && (
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      <p>Pages in this order (rename files to change it):</p>
                      <ol className="mt-1.5 max-h-32 list-inside list-decimal overflow-y-auto rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700">
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
                    Already under {formatBytes(maxBytes)}. Shrinking will still strip hidden data.
                  </p>
                )}
              </section>

              <div className="sticky bottom-0 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent pt-2 pb-1 dark:from-slate-950 dark:via-slate-950">
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
            </div>
          ) : (
            <DropZone onFiles={handleFiles} />
          )}
        </main>
      </div>
    </div>
  )
}

export default App
