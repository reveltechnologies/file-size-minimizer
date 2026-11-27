import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from '../lib/i18n'
import {
  clampPdfZoom,
  classifyPdfError,
  computePdfPageLayout,
  MAX_PDF_ZOOM,
  MIN_PDF_ZOOM,
  PDF_ZOOM_STEP,
} from '../lib/pdfViewer'
import { ERROR_BOX } from './styles'

interface PdfViewerProps {
  file: File
}

interface PdfPageSize {
  width: number
  height: number
}

interface PdfDocumentState {
  file: File
  doc: PDFDocumentProxy
  pageCount: number
  title: string | null
  defaultSize: PdfPageSize
}

interface PdfErrorState {
  file: File
  key: 'viewer.pdfPasswordProtected' | 'viewer.pdfError'
}

interface PdfPageCanvasProps {
  doc: PDFDocumentProxy
  pageNumber: number
  defaultSize: PdfPageSize
  containerWidth: number
  zoom: number
  scrollRoot: HTMLDivElement | null
  onVisibilityChange: (pageNumber: number, ratio: number) => void
}

const TOOL_BUTTON =
  'cursor-pointer rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 py-1 text-xs font-medium text-[var(--app-text)] transition-colors hover:bg-[var(--app-surface-2)] disabled:cursor-not-allowed disabled:opacity-40'

let pdfjsPromise: Promise<typeof import('pdfjs-dist')> | null = null

async function loadPdfJs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist/legacy/build/pdf.mjs').then((mod) => {
      mod.GlobalWorkerOptions.workerSrc = pdfWorkerUrl
      return mod
    })
  }
  return pdfjsPromise
}

function PdfPageCanvas({
  doc,
  pageNumber,
  defaultSize,
  containerWidth,
  zoom,
  scrollRoot,
  onVisibilityChange,
}: PdfPageCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [pageSize, setPageSize] = useState<PdfPageSize>(defaultSize)
  const [nearViewport, setNearViewport] = useState(pageNumber <= 2)

  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  const layout = useMemo(
    () => computePdfPageLayout(pageSize.width, pageSize.height, containerWidth, zoom, dpr),
    [pageSize.width, pageSize.height, containerWidth, zoom, dpr],
  )

  useEffect(() => {
    const el = wrapperRef.current
    if (!el || !scrollRoot) return

    const renderObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setNearViewport(entry.isIntersecting)
        }
      },
      { root: scrollRoot, rootMargin: '400px 0px' },
    )
    renderObserver.observe(el)

    const visibilityObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          onVisibilityChange(pageNumber, entry.isIntersecting ? entry.intersectionRatio : 0)
        }
      },
      { root: scrollRoot, threshold: [0, 0.25, 0.5, 0.75, 1] },
    )
    visibilityObserver.observe(el)

    return () => {
      renderObserver.disconnect()
      visibilityObserver.disconnect()
      onVisibilityChange(pageNumber, 0)
    }
  }, [pageNumber, scrollRoot, onVisibilityChange])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    if (!nearViewport) {
      canvas.width = 0
      canvas.height = 0
      return
    }

    let cancelled = false
    let renderTask: RenderTask | null = null

    async function renderPage() {
      const page = await doc.getPage(pageNumber)
      if (cancelled) return

      const unscaled = page.getViewport({ scale: 1 })
      if (
        Math.abs(unscaled.width - pageSize.width) > 0.5 ||
        Math.abs(unscaled.height - pageSize.height) > 0.5
      ) {
        setPageSize({ width: unscaled.width, height: unscaled.height })
        return
      }

      const targetCanvas = canvasRef.current
      if (!targetCanvas || cancelled) return

      targetCanvas.width = layout.canvasWidth
      targetCanvas.height = layout.canvasHeight

      const ctx = targetCanvas.getContext('2d', { alpha: false })
      if (ctx) {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, layout.canvasWidth, layout.canvasHeight)
      }

      const viewport = page.getViewport({ scale: layout.renderScale })
      renderTask = page.render({
        canvas: targetCanvas,
        viewport,
        background: '#ffffff',
      })
      await renderTask.promise
    }

    void renderPage().catch((err: unknown) => {
      if (cancelled) return
      if (err instanceof Error && err.name === 'RenderingCancelledException') return
    })

    return () => {
      cancelled = true
      renderTask?.cancel()
    }
  }, [
    doc,
    pageNumber,
    nearViewport,
    layout.canvasWidth,
    layout.canvasHeight,
    layout.renderScale,
    pageSize.width,
    pageSize.height,
  ])

  return (
    <div
      ref={wrapperRef}
      style={{ width: `${layout.cssWidth}px`, height: `${layout.cssHeight}px` }}
      className="mx-auto shrink-0 overflow-hidden rounded bg-white shadow-sm ring-1 ring-black/10"
    >
      <canvas
        ref={canvasRef}
        style={{ width: `${layout.cssWidth}px`, height: `${layout.cssHeight}px` }}
        className="block"
      />
    </div>
  )
}

export function PdfViewer({ file }: PdfViewerProps) {
  const { t } = useI18n()
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null)
  const [containerWidth, setContainerWidth] = useState(320)
  const [zoomState, setZoomState] = useState<{ file: File; value: number }>({ file, value: 1 })
  const [pageState, setPageState] = useState<{ file: File; value: number }>({ file, value: 1 })
  const [docState, setDocState] = useState<PdfDocumentState | null>(null)
  const [errorState, setErrorState] = useState<PdfErrorState | null>(null)
  const visibilityMapRef = useRef<Map<number, number>>(new Map())

  const activeDocState = docState?.file === file ? docState : null
  const activeErrorKey = errorState?.file === file ? errorState.key : null
  const loading = !activeDocState && !activeErrorKey
  const zoom = zoomState.file === file ? zoomState.value : 1
  const currentPage = pageState.file === file ? pageState.value : 1

  useEffect(() => {
    const el = scrollEl
    if (!el) return

    const updateWidth = () => {
      const style = getComputedStyle(el)
      const padX = parseFloat(style.paddingLeft || '0') + parseFloat(style.paddingRight || '0')
      const inner = Math.max(160, Math.floor(el.clientWidth - padX))
      setContainerWidth(inner)
    }

    updateWidth()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(updateWidth)
    observer.observe(el)
    return () => observer.disconnect()
  }, [scrollEl])

  useEffect(() => {
    let cancelled = false
    let loadingTask: PDFDocumentLoadingTask | null = null
    const visibilityMap = visibilityMapRef.current

    async function load() {
      try {
        const pdfjs = await loadPdfJs()
        const data = new Uint8Array(await file.arrayBuffer())
        if (cancelled) return

        loadingTask = pdfjs.getDocument({
          data,
          useSystemFonts: true,
        })
        const doc = await loadingTask.promise
        if (cancelled) {
          void loadingTask.destroy()
          return
        }

        const [firstPage, meta] = await Promise.all([
          doc.getPage(1),
          doc.getMetadata().catch(() => null),
        ])
        if (cancelled) {
          void loadingTask.destroy()
          return
        }

        const viewport = firstPage.getViewport({ scale: 1 })
        const rawTitle = (meta?.info as { Title?: unknown } | undefined)?.Title
        const title = typeof rawTitle === 'string' && rawTitle.trim() ? rawTitle.trim() : null

        visibilityMap.clear()
        setErrorState(null)
        setDocState({
          file,
          doc,
          pageCount: doc.numPages,
          title,
          defaultSize: { width: viewport.width, height: viewport.height },
        })
      } catch (err) {
        if (cancelled) return
        setErrorState({
          file,
          key:
            classifyPdfError(err) === 'password'
              ? 'viewer.pdfPasswordProtected'
              : 'viewer.pdfError',
        })
      }
    }

    void load()

    return () => {
      cancelled = true
      visibilityMap.clear()
      if (loadingTask) void loadingTask.destroy()
    }
  }, [file])

  const handleVisibilityChange = useCallback(
    (pageNumber: number, ratio: number) => {
      const map = visibilityMapRef.current
      if (ratio <= 0) {
        map.delete(pageNumber)
      } else {
        map.set(pageNumber, ratio)
      }
      let bestPage = 1
      let bestRatio = -1
      for (const [page, r] of map.entries()) {
        if (r > bestRatio || (r === bestRatio && page < bestPage)) {
          bestRatio = r
          bestPage = page
        }
      }
      if (bestRatio > 0) setPageState({ file, value: bestPage })
    },
    [file],
  )

  if (activeErrorKey) {
    return <div className={ERROR_BOX}>{t(activeErrorKey)}</div>
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex items-center justify-between gap-2 text-xs text-[var(--app-text-muted)]">
        <div className="flex min-w-0 items-center gap-2">
          {activeDocState && (
            <span className="shrink-0 tabular-nums">
              {activeDocState.pageCount > 1
                ? `${currentPage} / ${activeDocState.pageCount}`
                : t('viewer.pages', { count: activeDocState.pageCount })}
            </span>
          )}
          {activeDocState?.title && <span className="truncate">{activeDocState.title}</span>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            disabled={loading || zoom <= MIN_PDF_ZOOM}
            onClick={() =>
              setZoomState((prev) => ({
                file,
                value: clampPdfZoom((prev.file === file ? prev.value : 1) - PDF_ZOOM_STEP),
              }))
            }
            aria-label={t('viewer.zoomOut')}
            title={t('viewer.zoomOut')}
            className={TOOL_BUTTON}
          >
            −
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => setZoomState({ file, value: 1 })}
            aria-label={t('viewer.zoomReset')}
            title={t('viewer.zoomReset')}
            className={`${TOOL_BUTTON} min-w-12 tabular-nums`}
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            disabled={loading || zoom >= MAX_PDF_ZOOM}
            onClick={() =>
              setZoomState((prev) => ({
                file,
                value: clampPdfZoom((prev.file === file ? prev.value : 1) + PDF_ZOOM_STEP),
              }))
            }
            aria-label={t('viewer.zoomIn')}
            title={t('viewer.zoomIn')}
            className={TOOL_BUTTON}
          >
            +
          </button>
        </div>
      </div>

      <div
        ref={setScrollEl}
        data-no-swipe="true"
        data-scrollable="true"
        className="flex min-h-[54dvh] max-h-[60dvh] flex-1 flex-col gap-3 overflow-auto rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-2"
      >
        {loading || !activeDocState ? (
          <div className="my-auto py-12 text-center text-xs text-[var(--app-text-muted)]">
            {t('common.loading')}
          </div>
        ) : (
          Array.from({ length: activeDocState.pageCount }, (_, i) => i + 1).map((pageNumber) => (
            <PdfPageCanvas
              key={pageNumber}
              doc={activeDocState.doc}
              pageNumber={pageNumber}
              defaultSize={activeDocState.defaultSize}
              containerWidth={containerWidth}
              zoom={zoom}
              scrollRoot={scrollEl}
              onVisibilityChange={handleVisibilityChange}
            />
          ))
        )}
      </div>
    </div>
  )
}
