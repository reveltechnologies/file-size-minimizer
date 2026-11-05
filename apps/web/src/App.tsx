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
import { useRef, useState } from 'react'
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
    <div className="min-h-svh bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <main className="mx-auto flex max-w-xl flex-col gap-5 px-4 py-10">
        <header className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Fit-to-Size File Shrinker</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Shrink videos, photos and PDFs under any upload limit. 100% on your device — nothing is
            uploaded.
          </p>
        </header>

        {error && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200"
          >
            <p>{error}</p>
            {offerBlurry && picked && progress === null && (
              <button
                type="button"
                onClick={() => void handleShrink(true)}
                className={`${SECONDARY_BUTTON} self-start`}
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
          <section className={`${CARD} flex flex-col gap-5`}>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {isMerge ? `${picked.files.length} photos → 1 PDF` : picked.files[0].name}
                  </p>
                  <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                    {isMerge ? 'Photos' : CATEGORY_LABEL[picked.category]} · {formatBytes(totalBytes)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={reset}
                  className="shrink-0 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                  {isMerge ? 'Change photos' : 'Change file'}
                </button>
              </div>
              {isMerge && (
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  <p>Pages in this order (rename files to change it):</p>
                  {/* The height cuts a row in half, so a long list visibly scrolls on phones. */}
                  <ol className="mt-1 max-h-40 list-inside list-decimal overflow-y-auto rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
                    {picked.files.map((file, i) => (
                      <li key={i} className="truncate">
                        {file.name}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>

            <TargetPicker category={picked.category} target={target} onChange={setTarget} />
            {pngOffered ? (
              <ImageFormatPicker format={imageFormat} transparent={transparent} onChange={setFormatOverride} />
            ) : (
              photo &&
              !isJpegFile(photo.name, photo.type) && (
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Will be saved as JPG, which works everywhere.
                </p>
              )
            )}
            {isMerge ? (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                GPS location and camera data are always removed when combining photos.
              </p>
            ) : (
              <OptionToggles category={picked.category} options={options} onChange={setOptions} />
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
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Already under {formatBytes(maxBytes)}. Shrinking will still strip hidden data.
              </p>
            )}

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
          </section>
        ) : (
          <DropZone onFiles={handleFiles} />
        )}
      </main>
    </div>
  )
}

export default App
