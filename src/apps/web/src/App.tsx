import {
  calculateBitrate,
  DEFAULT_AUDIO_KBPS,
  formatBytes,
  offersPngOutput,
  type CompressOptions,
  type FileCategory,
  type ImageFormat,
} from '@revel/core'
import { Capacitor } from '@capacitor/core'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DropZone } from './components/DropZone'
import { FileViewer, type ExternalViewerFile } from './components/FileViewer'
import { OptionToggles } from './components/OptionToggles'
import { ProgressPanel } from './components/ProgressPanel'
import { RecentFilesCard } from './components/RecentFilesCard'
import { SavingsReceipt } from './components/SavingsReceipt'
import { SettingsPanel } from './components/SettingsPanel'
import { Toast } from './components/Toast'
import {
  ERROR_BOX,
  ICON_BUTTON,
  PRIMARY_BUTTON,
  SECONDARY_BUTTON,
  SECTION_HEAD,
  segmentClass,
  WARNING,
} from './components/styles'
import { TargetPicker } from './components/TargetPicker'
import { UpdatePrompt } from './components/UpdatePrompt'
import { VideoPlanNote } from './components/VideoPlanNote'
import { BlurryVideoError, compress, type CompressResult, type ProgressStep } from './engines'
import {
  addHistoryEntry,
  clearHistory,
  listHistory,
  trimHistory,
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
import {
  checkForUpdate,
  dismissUpdate,
  isUpdateDismissed,
  openPlayStore,
  type UpdateInfo,
} from './lib/updateCheck'
import {
  clampProgressWithRubberBand,
  detectSwipeAxis,
  resolveSwipeTargetIndex,
} from './lib/swipeGesture'
import { useShrinkEstimate } from './lib/useShrinkEstimate'
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
  text: 'category.text',
}

const WORKING_KEY: Record<FileCategory, TranslationKey> = {
  video: 'shrink.workingVideo',
  image: 'shrink.workingImage',
  pdf: 'shrink.workingPdf',
  text: 'shrink.workingText',
}

const STATUS_MAP: Record<string, TranslationKey> = {
  'Reading image…': 'status.reading',
  'Reading PDF…': 'status.reading',
  'Reading file…': 'status.reading',
  'Reading video…': 'status.reading',
  'Decoding HEIC…': 'status.decodingHeic',
  'Compressing…': 'status.compressing',
  'Loading video engine…': 'status.loadingVideo',
  'Encoding video…': 'status.encodingVideo',
  'Adjusting bitrate…': 'status.adjustingBitrate',
  'Optimizing PDF…': 'status.optimizingPdf',
  'Compressing pages…': 'status.compressingPages',
  'Building PDF…': 'status.buildingPdf',
}

const DONE_PAUSE_MS = 500

function isInteractiveElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(target.closest('input, select, textarea, a, [data-no-swipe="true"]'))
}

function isEditableFocused(): boolean {
  const el = document.activeElement
  if (!(el instanceof HTMLElement)) return false
  return (
    el.isContentEditable ||
    el.tagName === 'INPUT' ||
    el.tagName === 'TEXTAREA' ||
    el.tagName === 'SELECT'
  )
}

function summarizeActiveOptions(
  category: FileCategory,
  options: CompressOptions,
  imageFormat: ImageFormat,
  formatOverridden: boolean,
): string | null {
  const parts: string[] = []
  if (category === 'image') {
    if (formatOverridden) parts.push(imageFormat === 'jpeg' ? 'JPG' : imageFormat.toUpperCase())
    if (options.imageKeepDimensions) {
      parts.push('100%')
    } else if (options.imageScalePercent && options.imageScalePercent < 100) {
      parts.push(`${options.imageScalePercent}%`)
    } else if (options.imageMaxDimension) {
      parts.push(`${options.imageMaxDimension} px`)
    }
    if (options.imageGrayscale) parts.push('B&W')
  } else if (category === 'video') {
    if (options.videoMaxHeight === 0) parts.push('Orig')
    else if (options.videoMaxHeight) parts.push(`${options.videoMaxHeight}p`)
    if (options.videoMaxFps === 0) parts.push('Orig fps')
    else if (options.videoMaxFps) parts.push(`${options.videoMaxFps} fps`)
    if (options.muteAudio || options.videoAudioKbps === 0) parts.push('Muted')
  } else if (category === 'pdf') {
    if (options.pdfMaxDimension === 0) parts.push('Orig')
    else if (options.pdfMaxDimension) parts.push(`${options.pdfMaxDimension} px`)
    if (options.pdfImageQuality) parts.push(`${Math.round(options.pdfImageQuality * 100)}%`)
  }
  return parts.length > 0 ? parts.join(' · ') : null
}

function SceneIcon({ scene }: { scene: Scene }) {
  if (scene === 'viewer') {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-[18px]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M16 13H8M16 17H8" />
      </svg>
    )
  }
  if (scene === 'shrink') {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-[18px]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" />
      </svg>
    )
  }
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />
    </svg>
  )
}

function App() {
  const [scene, setScene] = useState<Scene>('shrink')
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings())
  const [picked, setPicked] = useState<PickedFiles | null>(null)
  const [target, setTarget] = useState<Target>(() => defaultTarget('video'))
  const [options, setOptions] = useState<CompressOptions>(() => loadSettings().options)
  const [showMoreOptions, setShowMoreOptions] = useState(false)
  const [tipForKey, setTipForKey] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [windowDragging, setWindowDragging] = useState(false)
  const [externalViewerFile, setExternalViewerFile] = useState<ExternalViewerFile | null>(null)
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
  const [availableUpdate, setAvailableUpdate] = useState<UpdateInfo | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const barTrackRef = useRef<HTMLDivElement | null>(null)
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const trackRef = useRef<HTMLElement | null>(null)
  const indicatorRef = useRef<HTMLSpanElement | null>(null)
  const visualProgressRef = useRef(1)
  const animFrameRef = useRef<number | null>(null)
  const suppressClickRef = useRef(false)
  const suppressClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const suppressBarClickRef = useRef(false)
  const barGestureRef = useRef<{
    pointerId: number | null
    startX: number
    active: boolean
    moved: boolean
    progress: number
  }>({ pointerId: null, startX: 0, active: false, moved: false, progress: 1 })
  const dragDepthRef = useRef(0)
  const viewerReqRef = useRef(0)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const gestureRef = useRef<{
    pointerId: number | null
    isTouch: boolean
    startX: number
    startY: number
    lastX: number
    lastTime: number
    velocity: number
    startProgress: number
    startScrollTop: number
    width: number
    active: boolean
    captured: boolean
    axis: 'none' | 'x' | 'y'
    scrollEl: HTMLElement | null
  }>({
    pointerId: null,
    isTouch: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastTime: 0,
    velocity: 0,
    startProgress: 1,
    startScrollTop: 0,
    width: 1,
    active: false,
    captured: false,
    axis: 'none',
    scrollEl: null,
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

  const notify = useCallback((message: string) => {
    setToast(message)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(null), 2200)
  }, [])

  const applyVisualProgress = useCallback((progress: number) => {
    visualProgressRef.current = progress
    if (trackRef.current) {
      trackRef.current.style.transform = `translate3d(${-progress * 100}%, 0, 0)`
    }
    if (indicatorRef.current) {
      const clamped = Math.max(0, Math.min(SCENES.length - 1, progress))
      indicatorRef.current.style.transform = `translate3d(${clamped * 100}%, 0, 0)`
    }
  }, [])

  const cancelSettle = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
  }, [])

  const animateToIndex = useCallback(
    (targetIndex: number) => {
      cancelSettle()
      const from = visualProgressRef.current
      const distance = Math.abs(targetIndex - from)
      if (distance < 0.001) {
        applyVisualProgress(targetIndex)
        return
      }
      const duration = Math.max(220, Math.min(340, Math.round(distance * 320)))
      let startTime: number | null = null
      const step = (now: number) => {
        if (startTime === null) startTime = now
        const t = Math.min(1, (now - startTime) / duration)
        const eased = 1 - (1 - t) ** 3
        applyVisualProgress(from + (targetIndex - from) * eased)
        if (t < 1) {
          animFrameRef.current = requestAnimationFrame(step)
        } else {
          animFrameRef.current = null
        }
      }
      animFrameRef.current = requestAnimationFrame(step)
    },
    [applyVisualProgress, cancelSettle],
  )

  const goToScene = useCallback(
    (nextScene: Scene) => {
      const idx = SCENES.findIndex((s) => s.id === nextScene)
      setScene(nextScene)
      if (idx >= 0) animateToIndex(idx)
    },
    [animateToIndex],
  )

  useEffect(() => {
    applyVisualProgress(1)
    return () => {
      cancelSettle()
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [applyVisualProgress, cancelSettle])

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      document.body.classList.add('native-platform')
    }
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
    const metaTheme = document.querySelector('meta[name="theme-color"]')
    if (metaTheme) {
      metaTheme.setAttribute('content', themeMeta.shellColor)
    }
    saveSettings(settings)
  }, [settings])

  useEffect(() => {
    if (!settings.rememberHistory) return
    void listHistory('viewed', settings.historyLimit).then(setViewedHistory)
    void listHistory('shrunk', settings.historyLimit).then(setShrunkHistory)
  }, [settings.rememberHistory, settings.historyLimit])

  useEffect(() => {
    let active = true
    void checkForUpdate().then((info) => {
      if (!active || !info) return
      if (isUpdateDismissed(info.dismissKey)) return
      setAvailableUpdate(info)
    })
    return () => {
      active = false
    }
  }, [])

  const sceneIndex = SCENES.findIndex((s) => s.id === scene)
  const activeSceneMeta = SCENES[sceneIndex]
  const isNative = Capacitor.isNativePlatform()

  const videoProbe = useVideoInfo(picked?.category === 'video' ? picked.files[0] : null)
  const videoInfo = videoProbe.info
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
  const maxBytes = picked
    ? picked.category === 'text'
      ? totalBytes
      : targetBytes(target, picked.category)
    : null

  const pickedPreviewUrl = useMemo(() => {
    if (!picked || picked.category !== 'image' || isMerge) return null
    const file = picked.files[0]
    return file?.type.startsWith('image/') ? URL.createObjectURL(file) : null
  }, [picked, isMerge])

  useEffect(() => {
    return () => {
      if (pickedPreviewUrl) URL.revokeObjectURL(pickedPreviewUrl)
    }
  }, [pickedPreviewUrl])

  const videoAudioKbps =
    options.muteAudio || options.videoAudioKbps === 0
      ? 0
      : (options.videoAudioKbps ?? DEFAULT_AUDIO_KBPS)
  const videoPlan =
    videoInfo && maxBytes !== null
      ? calculateBitrate({
          maxBytes,
          durationSec: videoInfo.durationSec,
          audioKbps: videoAudioKbps,
          sourceBytes: totalBytes,
        })
      : null

  const estimate = useShrinkEstimate(picked, maxBytes, options, imageFormat, videoProbe)

  const canShrink =
    maxBytes !== null &&
    (estimate.loading || estimate.canShrink) &&
    (!videoPlan || (videoPlan.possible && (videoPlan.feasible || allowBlurry))) &&
    (!pngOffered || settings.defaultPhotoFormat !== 'auto' || transparent !== null)

  const shrinkDisabledTooltip = !canShrink
    ? !estimate.loading && !estimate.canShrink
      ? estimate.shrinkability === 'never'
        ? t('estimate.tooltipNever')
        : t('estimate.tooltipSettings')
      : videoPlan && !videoPlan.possible
        ? t('estimate.tooltipSettings')
        : null
    : null

  const tipKey = picked
    ? `${picked.files[0]?.name ?? ''}:${maxBytes ?? ''}:${imageFormat}:${JSON.stringify(options)}`
    : ''
  const showTapTip = Boolean(shrinkDisabledTooltip && tipForKey === tipKey)

  const handleFiles = useCallback(
    (files: File[]) => {
      const pick = pickFiles(files)
      setResult(null)
      setAllowBlurry(false)
      setOfferBlurry(false)
      setFormatOverride(null)
      setShowMoreOptions(false)
      setOptions(settings.options)
      if (typeof pick === 'string') {
        setPicked(null)
        setError(pick)
        return
      }
      setError(null)
      setPicked(pick)
      const total = pick.files.reduce((sum, f) => sum + f.size, 0)
      setTarget(defaultTarget(pick.category, total))
    },
    [settings.options],
  )

  const openInViewer = useCallback(
    (file: File) => {
      setExternalViewerFile({ id: ++viewerReqRef.current, file })
      goToScene('viewer')
      if (settings.rememberHistory) {
        void addHistoryEntry(
          {
            bucket: 'viewed',
            fileName: file.name,
            mimeType: file.type,
            size: file.size,
            blob: file,
          },
          settings.historyLimit,
        ).then(setViewedHistory)
      }
    },
    [settings.rememberHistory, settings.historyLimit, goToScene],
  )

  const openInShrink = useCallback(
    (file: File) => {
      handleFiles([file])
      goToScene('shrink')
    },
    [handleFiles, goToScene],
  )

  const handleShrink = useCallback(
    async (forceBlurry = false) => {
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
          const updated = await addHistoryEntry(
            {
              bucket: 'shrunk',
              fileName: done.fileName,
              mimeType: done.blob.type,
              size: done.blob.size,
              originalSize: totalBytes,
              blob: done.blob,
            },
            settings.historyLimit,
          )
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
    },
    [
      picked,
      maxBytes,
      options,
      allowBlurry,
      imageFormat,
      isMerge,
      settings.filePrefix,
      settings.fileSuffix,
      settings.rememberHistory,
      settings.historyLimit,
      totalBytes,
    ],
  )

  function reset() {
    setPicked(null)
    setResult(null)
    setError(null)
    setShowMoreOptions(false)
  }

  function removeMergeFile(index: number) {
    if (!picked) return
    const next = picked.files.filter((_, i) => i !== index)
    if (next.length === 0) reset()
    else handleFiles(next)
  }

  function handleChangeSettings(next: AppSettings) {
    setSettings(next)
    setOptions(next.options)
    if (!next.rememberHistory) {
      setViewedHistory([])
      setShrunkHistory([])
      void clearHistory()
    } else if (next.historyLimit < settings.historyLimit) {
      void trimHistory(next.historyLimit).then(() => {
        void listHistory('viewed', next.historyLimit).then(setViewedHistory)
        void listHistory('shrunk', next.historyLimit).then(setShrunkHistory)
      })
    }
  }

  function handleFileViewed(file: File) {
    if (!settings.rememberHistory) return
    void addHistoryEntry(
      {
        bucket: 'viewed',
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        blob: file,
      },
      settings.historyLimit,
    ).then(setViewedHistory)
  }

  useEffect(() => {
    function onDragEnter(e: DragEvent) {
      if (!e.dataTransfer?.types?.includes('Files')) return
      e.preventDefault()
      dragDepthRef.current += 1
      setWindowDragging(true)
    }
    function onDragOver(e: DragEvent) {
      if (!e.dataTransfer?.types?.includes('Files')) return
      e.preventDefault()
    }
    function onDragLeave() {
      if (dragDepthRef.current <= 0) return
      dragDepthRef.current -= 1
      if (dragDepthRef.current === 0) setWindowDragging(false)
    }
    function onDrop(e: DragEvent) {
      if (!e.dataTransfer?.files?.length) return
      e.preventDefault()
      dragDepthRef.current = 0
      setWindowDragging(false)
      const files = [...e.dataTransfer.files]
      if (scene === 'viewer') {
        openInViewer(files[0])
      } else {
        handleFiles(files)
        goToScene('shrink')
      }
    }
    function onPaste(e: ClipboardEvent) {
      if (isEditableFocused()) return
      const files = [...(e.clipboardData?.files ?? [])]
      if (files.length === 0) return
      e.preventDefault()
      if (scene === 'viewer') {
        openInViewer(files[0])
      } else {
        handleFiles(files)
        goToScene('shrink')
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (availableUpdate) return
      if (e.key === 'Escape' && scene === 'shrink' && picked && progress === null) {
        reset()
      } else if (
        e.key === 'Enter' &&
        scene === 'shrink' &&
        picked &&
        progress === null &&
        !result &&
        canShrink &&
        !isEditableFocused() &&
        !(e.target instanceof HTMLElement && e.target.closest('button, label, a'))
      ) {
        e.preventDefault()
        void handleShrink()
      }
    }

    window.addEventListener('dragenter', onDragEnter)
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('drop', onDrop)
    window.addEventListener('paste', onPaste)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('dragenter', onDragEnter)
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('dragleave', onDragLeave)
      window.removeEventListener('drop', onDrop)
      window.removeEventListener('paste', onPaste)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [
    availableUpdate,
    scene,
    picked,
    progress,
    result,
    canShrink,
    openInViewer,
    handleFiles,
    handleShrink,
    goToScene,
  ])

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return

    const scheduleSuppressClick = () => {
      suppressClickRef.current = true
      if (suppressClickTimerRef.current) clearTimeout(suppressClickTimerRef.current)
      suppressClickTimerRef.current = setTimeout(() => {
        suppressClickRef.current = false
        suppressClickTimerRef.current = null
      }, 250)
    }

    const findTouch = (list: TouchList, id: number): Touch | null => {
      for (let i = 0; i < list.length; i++) {
        if (list[i].identifier === id) return list[i]
      }
      return null
    }

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1 || isInteractiveElement(event.target)) return
      const touch = event.touches[0]
      const now = performance.now()
      const scrollEl =
        event.target instanceof HTMLElement
          ? (event.target.closest('[data-scene-pane]') as HTMLElement | null)
          : null
      gestureRef.current = {
        pointerId: touch.identifier,
        isTouch: true,
        startX: touch.clientX,
        startY: touch.clientY,
        lastX: touch.clientX,
        lastTime: now,
        velocity: 0,
        startProgress: visualProgressRef.current,
        startScrollTop: scrollEl?.scrollTop ?? 0,
        width: el.clientWidth || 1,
        active: true,
        captured: false,
        axis: 'none',
        scrollEl,
      }
    }

    const onTouchMove = (event: TouchEvent) => {
      const g = gestureRef.current
      if (!g.active || !g.isTouch || g.pointerId === null) return
      if (event.touches.length !== 1) return
      const touch = findTouch(event.touches, g.pointerId)
      if (!touch) return

      const dx = touch.clientX - g.startX
      const dy = touch.clientY - g.startY

      if (g.axis === 'none') {
        if (!event.cancelable) {
          g.axis = 'y'
          return
        }
        const axis = detectSwipeAxis(dx, dy)
        if (axis === 'none') return
        g.axis = axis
        if (axis === 'y') return
        cancelSettle()
        g.lastX = touch.clientX
        g.lastTime = performance.now()
      }

      if (g.axis === 'x') {
        if (event.cancelable) event.preventDefault()
        const now = performance.now()
        const dt = now - g.lastTime
        if (dt > 0) {
          const instVel = (touch.clientX - g.lastX) / dt
          g.velocity = g.velocity * 0.4 + instVel * 0.6
          g.lastX = touch.clientX
          g.lastTime = now
        }
        const rawProgress = g.startProgress - dx / Math.max(1, g.width)
        applyVisualProgress(clampProgressWithRubberBand(rawProgress, SCENES.length))
      }
    }

    const finishTouch = (event: TouchEvent, cancelled: boolean) => {
      const g = gestureRef.current
      if (!g.active || !g.isTouch || g.pointerId === null) return
      const touch = findTouch(event.changedTouches, g.pointerId)
      if (!touch) return

      g.active = false
      g.isTouch = false
      g.pointerId = null

      if (g.axis === 'x') {
        const dx = touch.clientX - g.startX
        if (Math.abs(dx) > 10) scheduleSuppressClick()
        const targetIndex = resolveSwipeTargetIndex({
          startProgress: g.startProgress,
          currentProgress: visualProgressRef.current,
          velocityPxPerMs: cancelled ? 0 : g.velocity,
          idleMs: performance.now() - g.lastTime,
          sceneCount: SCENES.length,
        })
        setScene(SCENES[targetIndex].id)
        animateToIndex(targetIndex)
      }
    }

    const onTouchEnd = (event: TouchEvent) => finishTouch(event, false)
    const onTouchCancel = (event: TouchEvent) => finishTouch(event, true)

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    el.addEventListener('touchcancel', onTouchCancel, { passive: true })

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchCancel)
      if (suppressClickTimerRef.current) {
        clearTimeout(suppressClickTimerRef.current)
        suppressClickTimerRef.current = null
      }
    }
  }, [applyVisualProgress, cancelSettle, animateToIndex])

  function computeBarProgress(clientX: number): number {
    const track = barTrackRef.current
    if (!track) return visualProgressRef.current
    const rect = track.getBoundingClientRect()
    if (rect.width <= 0) return visualProgressRef.current
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    return Math.max(0, Math.min(SCENES.length - 1, ratio * SCENES.length - 0.5))
  }

  const estimatePct =
    estimate.estimatedBytes !== null && totalBytes > 0
      ? Math.round((1 - estimate.estimatedBytes / totalBytes) * 100)
      : null

  const hasMoreSection =
    picked !== null &&
    !isMerge &&
    !(picked.category === 'text' && options.textMode === 'gzip')
  const optionsSummary = picked
    ? summarizeActiveOptions(picked.category, options, imageFormat, formatOverride !== null)
    : null

  const localizedStatus = STATUS_MAP[status] ? t(STATUS_MAP[status]) : status

  return (
    <I18nContext value={i18nValue}>
      <div
        className={`flex h-full min-h-dvh w-full flex-col overflow-hidden text-[var(--app-text)] ${
          isNative ? 'bg-[var(--app-bg)]' : 'bg-[var(--app-bg)] sm:bg-[var(--app-outer)]'
        }`}
      >
        {windowDragging && (
          <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-6">
            <div className="rounded-xl border-2 border-dashed border-[var(--app-accent)] bg-[var(--app-surface)] px-6 py-4 text-sm font-medium text-[var(--app-text)]">
              {t('common.dropAnywhere')}
            </div>
          </div>
        )}

        <div
          aria-hidden="true"
          className="portrait-lock-overlay fixed inset-0 z-50 hidden flex-col items-center justify-center gap-2 bg-black px-6 text-center text-white"
        >
          <svg
            viewBox="0 0 24 24"
            className="size-10 text-[var(--app-accent-text)]"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="6" y="2" width="12" height="20" rx="2" />
            <path d="M12 18h.01" />
          </svg>
          <p className="text-sm font-semibold">{t('common.portraitOnly')}</p>
        </div>

        <div
          className={`mx-auto flex h-full w-full flex-1 flex-col overflow-hidden bg-[var(--app-bg)] ${
            isNative
              ? 'max-w-none'
              : 'max-w-none sm:max-w-lg sm:border-x sm:border-[var(--app-border)]'
          }`}
        >
          <header className="z-10 flex shrink-0 items-center justify-between gap-3 border-b border-[var(--app-border)] bg-[var(--app-bg)] px-4 pt-[max(env(safe-area-inset-top),0.65rem)] pb-2.5 pl-[max(env(safe-area-inset-left),1rem)] pr-[max(env(safe-area-inset-right),1rem)]">
            <div className="flex min-w-0 items-center gap-2.5">
              <img src="/logo.png" alt="" className="size-6 shrink-0 rounded object-contain" />
              <h1 className="truncate text-base font-semibold tracking-tight">
                {t(activeSceneMeta.labelKey)}
              </h1>
            </div>
          </header>

          <div
            ref={viewportRef}
            onClickCapture={(event) => {
              if (!suppressClickRef.current) return
              suppressClickRef.current = false
              event.stopPropagation()
              event.preventDefault()
            }}
            onPointerDown={(event) => {
              if (
                event.pointerType === 'touch' ||
                event.button !== 0 ||
                isInteractiveElement(event.target)
              ) {
                return
              }
              const now = performance.now()
              const scrollEl =
                event.target instanceof HTMLElement
                  ? (event.target.closest('[data-scene-pane]') as HTMLElement | null)
                  : null
              gestureRef.current = {
                pointerId: event.pointerId,
                isTouch: false,
                startX: event.clientX,
                startY: event.clientY,
                lastX: event.clientX,
                lastTime: now,
                velocity: 0,
                startProgress: visualProgressRef.current,
                startScrollTop: scrollEl?.scrollTop ?? 0,
                width: viewportRef.current?.clientWidth || 1,
                active: true,
                captured: false,
                axis: 'none',
                scrollEl,
              }
            }}
            onPointerMove={(event) => {
              if (event.pointerType === 'touch') return
              const g = gestureRef.current
              if (!g.active || g.isTouch || g.pointerId !== event.pointerId) return
              const dx = event.clientX - g.startX
              const dy = event.clientY - g.startY
              if (g.axis === 'none') {
                const axis = detectSwipeAxis(dx, dy)
                if (axis !== 'none') g.axis = axis
              }
              if (g.axis === 'x') {
                if (!g.captured) {
                  cancelSettle()
                  event.currentTarget.setPointerCapture(event.pointerId)
                  g.captured = true
                  g.lastX = event.clientX
                  g.lastTime = performance.now()
                }
                const now = performance.now()
                const dt = now - g.lastTime
                if (dt > 0) {
                  const instVel = (event.clientX - g.lastX) / dt
                  g.velocity = g.velocity * 0.4 + instVel * 0.6
                  g.lastX = event.clientX
                  g.lastTime = now
                }
                const rawProgress = g.startProgress - dx / Math.max(1, g.width)
                applyVisualProgress(clampProgressWithRubberBand(rawProgress, SCENES.length))
              } else if (g.axis === 'y' && g.scrollEl && event.pointerType === 'mouse') {
                g.scrollEl.scrollTop = g.startScrollTop - dy
              }
            }}
            onPointerUp={(event) => {
              if (event.pointerType === 'touch') return
              const g = gestureRef.current
              if (!g.active || g.isTouch || g.pointerId !== event.pointerId) return
              g.active = false
              g.pointerId = null
              if (g.axis === 'x') {
                const dx = event.clientX - g.startX
                if (Math.abs(dx) > 10) {
                  suppressClickRef.current = true
                  if (suppressClickTimerRef.current) clearTimeout(suppressClickTimerRef.current)
                  suppressClickTimerRef.current = setTimeout(() => {
                    suppressClickRef.current = false
                    suppressClickTimerRef.current = null
                  }, 50)
                }
                const targetIndex = resolveSwipeTargetIndex({
                  startProgress: g.startProgress,
                  currentProgress: visualProgressRef.current,
                  velocityPxPerMs: g.velocity,
                  idleMs: performance.now() - g.lastTime,
                  sceneCount: SCENES.length,
                })
                setScene(SCENES[targetIndex].id)
                animateToIndex(targetIndex)
              }
            }}
            onPointerCancel={(event) => {
              if (event.pointerType === 'touch') return
              const g = gestureRef.current
              if (!g.active || g.isTouch || g.pointerId !== event.pointerId) return
              g.active = false
              g.pointerId = null
              if (g.axis === 'x') {
                const targetIndex = resolveSwipeTargetIndex({
                  startProgress: g.startProgress,
                  currentProgress: visualProgressRef.current,
                  velocityPxPerMs: 0,
                  idleMs: 0,
                  sceneCount: SCENES.length,
                })
                setScene(SCENES[targetIndex].id)
                animateToIndex(targetIndex)
              }
            }}
            style={{ touchAction: 'pan-y' }}
            className="relative flex-1 overflow-hidden overscroll-x-none"
          >
            <main ref={trackRef} className="flex h-full w-full will-change-transform">
              <section
                data-scene-pane="viewer"
                aria-hidden={scene !== 'viewer'}
                className="flex h-full w-full shrink-0 flex-col gap-4 overflow-y-auto overscroll-x-none px-4 py-4 pb-5 pl-[max(env(safe-area-inset-left),1rem)] pr-[max(env(safe-area-inset-right),1rem)]"
              >
                <FileViewer
                  recentViewed={settings.rememberHistory ? viewedHistory : []}
                  outputLocationMode={settings.outputLocationMode}
                  externalFile={externalViewerFile}
                  onFileViewed={handleFileViewed}
                  onClearViewed={() => {
                    setViewedHistory([])
                    void clearHistory('viewed')
                  }}
                  onShrinkFile={openInShrink}
                  onNotify={notify}
                />
              </section>

              <section
                data-scene-pane="shrink"
                aria-hidden={scene !== 'shrink'}
                className="flex h-full w-full shrink-0 flex-col gap-4 overflow-y-auto overscroll-x-none px-4 py-4 pb-5 pl-[max(env(safe-area-inset-left),1rem)] pr-[max(env(safe-area-inset-right),1rem)]"
              >
                {error && (
                  <div role="alert" className={`${ERROR_BOX} flex flex-col gap-2`}>
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
                    onPreview={openInViewer}
                    onNotify={notify}
                  />
                ) : picked && progress !== null ? (
                  <ProgressPanel
                    title={isMerge ? t('shrink.buildingPdf') : t(WORKING_KEY[picked.category])}
                    fileName={
                      isMerge
                        ? t('shrink.photosToPdf', { count: picked.files.length })
                        : picked.files[0]?.name
                    }
                    step={step}
                    ratio={progress}
                    status={localizedStatus}
                    onCancel={() => abortRef.current?.abort()}
                  />
                ) : picked ? (
                  <div className="flex flex-1 flex-col gap-4">
                    <div className="border-b border-[var(--app-border)] pb-3">
                      <div className="flex items-center justify-between gap-2.5">
                        <div className="flex min-w-0 items-center gap-2.5">
                          {pickedPreviewUrl && (
                            <img
                              src={pickedPreviewUrl}
                              alt=""
                              className="size-10 shrink-0 rounded-md border border-[var(--app-border)] object-cover"
                            />
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[var(--app-text)]">
                              {isMerge
                                ? t('shrink.photosToPdf', { count: picked.files.length })
                                : picked.files[0].name}
                            </p>
                            <p className="truncate text-xs tabular-nums text-[var(--app-text-muted)]">
                              {isMerge ? t('category.photos') : t(CATEGORY_KEY[picked.category])} ·{' '}
                              {formatBytes(totalBytes)}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={reset}
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

                      {isMerge && (
                        <ol
                          data-scrollable="true"
                          className="mt-2 max-h-28 divide-y divide-[var(--app-border)] overflow-y-auto border-t border-[var(--app-border)] pt-1 text-xs text-[var(--app-text-muted)]"
                        >
                          {picked.files.map((file, i) => (
                            <li key={`${file.name}-${i}`} className="flex items-center justify-between gap-2 py-1">
                              <span className="truncate tabular-nums">
                                {i + 1}. {file.name}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeMergeFile(i)}
                                aria-label={`${t('common.remove')} ${file.name}`}
                                className="shrink-0 cursor-pointer rounded p-0.5 text-[var(--app-text-muted)] hover:text-[var(--app-text)]"
                              >
                                <svg
                                  aria-hidden="true"
                                  viewBox="0 0 24 24"
                                  className="size-3.5"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M18 6 6 18M6 6l12 12" />
                                </svg>
                              </button>
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>

                    {picked.category !== 'text' ? (
                      <TargetPicker
                        category={picked.category}
                        target={target}
                        sourceBytes={totalBytes}
                        onChange={setTarget}
                      />
                    ) : (
                      <div className="flex flex-col gap-2">
                        <span className={SECTION_HEAD}>{t('options.method')}</span>
                        <div className="grid grid-cols-2 gap-0.5 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-0.5">
                          <button
                            type="button"
                            aria-pressed={(options.textMode ?? 'minify') === 'minify'}
                            onClick={() => setOptions({ ...options, textMode: 'minify' })}
                            className={`${segmentClass((options.textMode ?? 'minify') === 'minify')} cursor-pointer py-2 text-center text-sm`}
                          >
                            {t('options.keepFormat')}
                          </button>
                          <button
                            type="button"
                            aria-pressed={options.textMode === 'gzip'}
                            onClick={() => setOptions({ ...options, textMode: 'gzip' })}
                            className={`${segmentClass(options.textMode === 'gzip')} cursor-pointer py-2 text-center text-sm`}
                          >
                            {t('options.compressGz')}
                          </button>
                        </div>
                      </div>
                    )}

                    {hasMoreSection && (
                      <div className="border-y border-[var(--app-border)]">
                        <button
                          type="button"
                          aria-expanded={showMoreOptions}
                          onClick={() => setShowMoreOptions((prev) => !prev)}
                          className="flex w-full cursor-pointer items-center justify-between gap-2 py-2.5 text-left text-sm font-medium text-[var(--app-text)]"
                        >
                          <span>{t('options.more')}</span>
                          <span className="flex items-center gap-2 text-xs text-[var(--app-text-muted)]">
                            {optionsSummary && !showMoreOptions && <span>{optionsSummary}</span>}
                            <svg
                              aria-hidden="true"
                              viewBox="0 0 24 24"
                              className={`size-4 transition-transform ${
                                showMoreOptions ? 'rotate-180' : ''
                              }`}
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="m6 9 6 6 6-6" />
                            </svg>
                          </span>
                        </button>

                        {showMoreOptions && (
                          <div className="border-t border-[var(--app-border)]">
                            <OptionToggles
                              category={picked.category}
                              options={options}
                              imageFormat={imageFormat}
                              transparent={transparent}
                              fileName={picked.files[0]?.name}
                              onChange={setOptions}
                              onChangeImageFormat={setFormatOverride}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {videoInfo && videoPlan && maxBytes !== null && (
                      <VideoPlanNote
                        info={videoInfo}
                        plan={videoPlan}
                        maxBytes={maxBytes}
                        smartOptimize={options.smartOptimize}
                        videoMaxHeight={options.videoMaxHeight}
                        allowBlurry={allowBlurry}
                        onAllowBlurryChange={setAllowBlurry}
                      />
                    )}

                    <div className="mt-auto flex flex-col gap-2.5 pt-2">
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="text-[var(--app-text-muted)]">{t('estimate.label')}</span>
                        <span className="tabular-nums">
                          {estimate.loading ? (
                            <span className="text-xs text-[var(--app-text-muted)]">
                              {t('estimate.calculating')}
                            </span>
                          ) : estimate.estimatedBytes !== null ? (
                            <>
                              <span className="font-semibold text-[var(--app-text)]">
                                {estimate.exact ? '' : '~'}
                                {formatBytes(estimate.estimatedBytes)}
                              </span>
                              {estimatePct !== null && estimatePct > 0 && (
                                <span className="ml-1.5 text-xs font-medium text-[var(--app-accent-text)]">
                                  ({t('estimate.smaller', { pct: estimatePct })})
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-[var(--app-text-muted)]">—</span>
                          )}
                        </span>
                      </div>

                      {estimate.reasonKey && !estimate.loading && (
                        <p className={WARNING}>{t(estimate.reasonKey)}</p>
                      )}

                      <div
                        title={shrinkDisabledTooltip ?? undefined}
                        onClick={() => {
                          if (!shrinkDisabledTooltip) return
                          const currentKey = tipKey
                          setTipForKey(currentKey)
                          setTimeout(() => {
                            setTipForKey((prev) => (prev === currentKey ? null : prev))
                          }, 2500)
                        }}
                        className={`group relative w-full ${
                          shrinkDisabledTooltip ? 'cursor-not-allowed' : ''
                        }`}
                      >
                        {shrinkDisabledTooltip && (
                          <div
                            role="tooltip"
                            className={`pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 rounded-md border border-[var(--app-border-strong)] bg-[var(--app-surface-2)] px-3 py-1.5 text-center text-xs font-medium whitespace-nowrap text-[var(--app-text)] shadow-md transition-opacity ${
                              showTapTip
                                ? 'visible opacity-100'
                                : 'invisible opacity-0 group-hover:visible group-hover:opacity-100'
                            }`}
                          >
                            {shrinkDisabledTooltip}
                          </div>
                        )}
                        <button
                          type="button"
                          disabled={!canShrink}
                          onClick={() => void handleShrink()}
                          className={`${PRIMARY_BUTTON} ${
                            shrinkDisabledTooltip ? 'pointer-events-none' : ''
                          }`}
                        >
                          {maxBytes === null
                            ? t('shrink.setLimit')
                            : isMerge
                              ? t('shrink.combineUnder', { size: formatBytes(maxBytes) })
                              : picked.category === 'text'
                                ? t('shrink.shrinkFile')
                                : t('shrink.shrinkUnder', { size: formatBytes(maxBytes) })}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-1 flex-col gap-4">
                    <DropZone onFiles={handleFiles} />
                    {settings.rememberHistory && (
                      <RecentFilesCard
                        title={t('common.recent')}
                        entries={shrunkHistory}
                        outputLocationMode={settings.outputLocationMode}
                        onOpen={(entry) =>
                          openInViewer(
                            new File([entry.blob], entry.fileName, {
                              type: entry.mimeType || entry.blob.type,
                            }),
                          )
                        }
                        onClear={() => {
                          setShrunkHistory([])
                          void clearHistory('shrunk')
                        }}
                        onNotify={notify}
                      />
                    )}
                  </div>
                )}
              </section>

              <section
                data-scene-pane="settings"
                aria-hidden={scene !== 'settings'}
                className="flex h-full w-full shrink-0 flex-col gap-4 overflow-y-auto overscroll-x-none px-4 py-4 pb-5 pl-[max(env(safe-area-inset-left),1rem)] pr-[max(env(safe-area-inset-right),1rem)]"
              >
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
              </section>
            </main>
          </div>

          <Toast message={toast} />

          {availableUpdate && (
            <UpdatePrompt
              onDismiss={() => {
                dismissUpdate(availableUpdate.dismissKey)
                setAvailableUpdate(null)
              }}
              onUpdate={() => {
                dismissUpdate(availableUpdate.dismissKey)
                setAvailableUpdate(null)
                void openPlayStore()
              }}
            />
          )}

          <nav
            aria-label="App scenes"
            className="z-10 shrink-0 border-t border-[var(--app-border)] bg-[var(--app-surface)] pb-[max(env(safe-area-inset-bottom),0.25rem)] pl-[max(env(safe-area-inset-left),0px)] pr-[max(env(safe-area-inset-right),0px)]"
          >
            <div
              ref={barTrackRef}
              onClickCapture={(event) => {
                if (!suppressBarClickRef.current) return
                suppressBarClickRef.current = false
                event.stopPropagation()
                event.preventDefault()
              }}
              onPointerDown={(event) => {
                barGestureRef.current = {
                  pointerId: event.pointerId,
                  startX: event.clientX,
                  active: true,
                  moved: false,
                  progress: visualProgressRef.current,
                }
              }}
              onPointerMove={(event) => {
                const bg = barGestureRef.current
                if (!bg.active || bg.pointerId !== event.pointerId) return
                if (!bg.moved && Math.abs(event.clientX - bg.startX) > 6) {
                  bg.moved = true
                  cancelSettle()
                  event.currentTarget.setPointerCapture(event.pointerId)
                }
                if (bg.moved) {
                  const nextProg = computeBarProgress(event.clientX)
                  bg.progress = nextProg
                  applyVisualProgress(nextProg)
                }
              }}
              onPointerUp={(event) => {
                const bg = barGestureRef.current
                if (!bg.active || bg.pointerId !== event.pointerId) return
                bg.active = false
                bg.pointerId = null
                if (bg.moved) {
                  const targetIdx = Math.max(
                    0,
                    Math.min(SCENES.length - 1, Math.round(bg.progress)),
                  )
                  suppressBarClickRef.current = true
                  setTimeout(() => {
                    suppressBarClickRef.current = false
                  }, 50)
                  setScene(SCENES[targetIdx].id)
                  animateToIndex(targetIdx)
                }
              }}
              onPointerCancel={(event) => {
                const bg = barGestureRef.current
                if (!bg.active || bg.pointerId !== event.pointerId) return
                bg.active = false
                bg.pointerId = null
                if (bg.moved) {
                  const targetIdx = Math.max(
                    0,
                    Math.min(SCENES.length - 1, Math.round(bg.progress)),
                  )
                  setScene(SCENES[targetIdx].id)
                  animateToIndex(targetIdx)
                }
              }}
              className="relative grid touch-none grid-cols-3 select-none"
            >
              <span
                ref={indicatorRef}
                aria-hidden="true"
                className="pointer-events-none absolute top-0 left-0 h-0.5 w-1/3 bg-[var(--app-accent)] will-change-transform"
              />
              {SCENES.map((item) => {
                const active = scene === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-current={active ? 'page' : undefined}
                    onClick={() => goToScene(item.id)}
                    className={`relative flex cursor-pointer flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
                      active
                        ? 'text-[var(--app-accent-text)]'
                        : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
                    }`}
                  >
                    <SceneIcon scene={item.id} />
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
