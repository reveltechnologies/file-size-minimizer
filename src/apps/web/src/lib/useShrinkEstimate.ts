import {
  calculateBitrate,
  DEFAULT_AUDIO_KBPS,
  estimateBytes,
  shortSideCap,
  type CompressOptions,
  type ImageFormat,
} from '@revel/core'
import { useEffect, useMemo, useState } from 'react'
import type { Shrinkability } from '../engines/image'
import type { PdfInspection } from '../engines/pdf'
import type { PickedFiles } from './pickFiles'
import type { VideoProbeState } from './useVideoInfo'

export type EstimateReasonKey =
  | 'estimate.cannotShrink'
  | 'estimate.cannotShrinkEver'
  | 'estimate.cannotFit'
  | 'estimate.noPdfImages'
  | 'estimate.tryGzip'

export interface ShrinkEstimate {
  loading: boolean
  estimatedBytes: number | null
  canShrink: boolean
  fitsTarget: boolean
  shrinkability: Shrinkability
  detail: string | null
  reasonKey: EstimateReasonKey | null
  exact: boolean
}

const pdfInspectionCache = new WeakMap<File, Promise<PdfInspection>>()

function getPdfInspection(file: File): Promise<PdfInspection> {
  let pending = pdfInspectionCache.get(file)
  if (!pending) {
    pending = import('../engines/pdf').then((mod) => mod.inspectPdf(file))
    pdfInspectionCache.set(file, pending)
  }
  return pending
}

const EMPTY_ESTIMATE: ShrinkEstimate = {
  loading: false,
  estimatedBytes: null,
  canShrink: true,
  fitsTarget: true,
  shrinkability: 'ok',
  detail: null,
  reasonKey: null,
  exact: false,
}

export function useShrinkEstimate(
  picked: PickedFiles | null,
  maxBytes: number | null,
  options: CompressOptions,
  imageFormat: ImageFormat,
  videoProbe: VideoProbeState,
): ShrinkEstimate {
  const syncEstimate = useMemo((): ShrinkEstimate | null => {
    if (!picked || maxBytes === null) return EMPTY_ESTIMATE

    const totalBytes = picked.files.reduce((sum, f) => sum + f.size, 0)
    const isMerge = picked.files.length > 1

    if (picked.category === 'video') {
      if (videoProbe.status === 'loading') return { ...EMPTY_ESTIMATE, loading: true }
      if (videoProbe.status !== 'ready' || !videoProbe.info) return EMPTY_ESTIMATE

      const videoInfo = videoProbe.info
      const audioKbps =
        options.muteAudio || options.videoAudioKbps === 0
          ? 0
          : (options.videoAudioKbps ?? DEFAULT_AUDIO_KBPS)
      const plan = calculateBitrate({
        maxBytes,
        durationSec: videoInfo.durationSec,
        audioKbps,
        sourceBytes: totalBytes,
      })
      const cap =
        options.videoMaxHeight === 0
          ? null
          : options.videoMaxHeight != null
            ? options.videoMaxHeight
            : options.smartOptimize
              ? shortSideCap(plan.videoKbps)
              : null
      const shortSide = Math.min(videoInfo.width, videoInfo.height)
      const scale = cap ? Math.min(1, cap / shortSide) : 1
      const outW = Math.max(2, Math.floor((videoInfo.width * scale) / 2) * 2)
      const outH = Math.max(2, Math.floor((videoInfo.height * scale) / 2) * 2)
      const fpsLabel =
        options.videoMaxFps != null
          ? options.videoMaxFps > 0
            ? ` · ${options.videoMaxFps} fps`
            : ''
          : options.smartOptimize
            ? ' · 30 fps'
            : ''

      if (!plan.possible) {
        return {
          loading: false,
          estimatedBytes: null,
          canShrink: false,
          fitsTarget: false,
          shrinkability: 'with-settings',
          detail: `${outW}×${outH}${fpsLabel}`,
          reasonKey: 'estimate.cannotFit',
          exact: false,
        }
      }

      const est = Math.round(estimateBytes(plan, videoInfo.durationSec))
      const canShrink = est < totalBytes
      return {
        loading: false,
        estimatedBytes: est,
        canShrink,
        fitsTarget: est <= maxBytes,
        shrinkability: canShrink ? 'ok' : 'with-settings',
        detail: `${outW}×${outH}${fpsLabel} · ${plan.videoKbps} kbps`,
        reasonKey: canShrink ? null : 'estimate.cannotShrink',
        exact: false,
      }
    }

    if (isMerge) {
      return {
        loading: false,
        estimatedBytes: Math.min(maxBytes, picked.files.length * 220_000),
        canShrink: true,
        fitsTarget: true,
        shrinkability: 'ok',
        detail: null,
        reasonKey: null,
        exact: false,
      }
    }

    return null
  }, [picked, maxBytes, options, videoProbe])

  const asyncKey =
    syncEstimate !== null || !picked || maxBytes === null
      ? null
      : JSON.stringify({
          name: picked.files[0].name,
          size: picked.files[0].size,
          cat: picked.category,
          maxBytes,
          imageFormat,
          options,
        })

  const [asyncState, setAsyncState] = useState<{
    key: string
    estimate: ShrinkEstimate
  } | null>(null)

  useEffect(() => {
    if (!asyncKey || !picked || maxBytes === null) return

    const controller = new AbortController()
    const file = picked.files[0]
    const category = picked.category

    const timer = setTimeout(() => {
      void (async () => {
        try {
          if (category === 'text') {
            const { estimateTextShrink } = await import('../engines/text')
            const res = await estimateTextShrink(file, options)
            if (controller.signal.aborted) return
            const modeLabel = res.mode === 'gzip' ? 'gzip' : res.subtype
            let reasonKey: EstimateReasonKey | null = null
            if (!res.canShrink) {
              if (res.shrinkability === 'never') reasonKey = 'estimate.cannotShrinkEver'
              else if (res.mode === 'minify') reasonKey = 'estimate.tryGzip'
              else reasonKey = 'estimate.cannotShrink'
            }
            setAsyncState({
              key: asyncKey,
              estimate: {
                loading: false,
                estimatedBytes: res.estimatedBytes,
                canShrink: res.canShrink,
                fitsTarget: true,
                shrinkability: res.shrinkability,
                detail: modeLabel,
                reasonKey,
                exact: true,
              },
            })
            return
          }

          if (category === 'image') {
            const { estimateImageShrink } = await import('../engines/image')
            const res = await estimateImageShrink(
              file,
              maxBytes,
              options,
              imageFormat,
              controller.signal,
            )
            if (controller.signal.aborted) return
            const dims =
              res.outputWidth !== res.width || res.outputHeight !== res.height
                ? `${res.width}×${res.height} → ${res.outputWidth}×${res.outputHeight}`
                : `${res.width}×${res.height}`
            let reasonKey: EstimateReasonKey | null = null
            if (!res.fitsTarget) reasonKey = 'estimate.cannotFit'
            else if (!res.canShrink) {
              reasonKey =
                res.shrinkability === 'never'
                  ? 'estimate.cannotShrinkEver'
                  : 'estimate.cannotShrink'
            }
            setAsyncState({
              key: asyncKey,
              estimate: {
                loading: false,
                estimatedBytes: res.estimatedBytes,
                canShrink: res.canShrink,
                fitsTarget: res.fitsTarget,
                shrinkability: res.shrinkability,
                detail: dims,
                reasonKey,
                exact: false,
              },
            })
            return
          }

          if (category === 'pdf') {
            const info = await getPdfInspection(file)
            if (controller.signal.aborted) return
            if (info.imageCount === 0) {
              setAsyncState({
                key: asyncKey,
                estimate: {
                  loading: false,
                  estimatedBytes: file.size,
                  canShrink: false,
                  fitsTarget: file.size <= maxBytes,
                  shrinkability: 'never',
                  detail: `${info.pageCount}p`,
                  reasonKey: 'estimate.noPdfImages',
                  exact: false,
                },
              })
              return
            }

            const hasExplicitImageSettings =
              options.pdfMaxDimension != null || options.pdfImageQuality != null
            if (file.size <= maxBytes && !hasExplicitImageSettings && !options.stripHiddenData) {
              setAsyncState({
                key: asyncKey,
                estimate: {
                  loading: false,
                  estimatedBytes: file.size,
                  canShrink: false,
                  fitsTarget: true,
                  shrinkability: 'with-settings',
                  detail: `${info.pageCount}p`,
                  reasonKey: 'estimate.cannotShrink',
                  exact: false,
                },
              })
              return
            }

            const qualityFactor = options.pdfImageQuality ?? 0.5
            const dimFactor =
              options.pdfMaxDimension === 0
                ? 1
                : options.pdfMaxDimension
                  ? Math.min(1, options.pdfMaxDimension / 1754)
                  : 0.75
            const ratio = Math.max(0.18, Math.min(0.85, qualityFactor * dimFactor * 1.1))
            const rawEst = Math.round(info.nonImageBytes + info.imageBytes * ratio)
            const est =
              options.pdfMaxDimension || options.pdfImageQuality
                ? Math.min(file.size, rawEst)
                : Math.min(file.size, Math.max(rawEst, Math.min(maxBytes, rawEst)))
            const minPossible = Math.round(info.nonImageBytes + info.imageBytes * 0.18)
            const canShrink = est < file.size
            const fitsTarget = minPossible <= maxBytes
            setAsyncState({
              key: asyncKey,
              estimate: {
                loading: false,
                estimatedBytes: est,
                canShrink,
                fitsTarget,
                shrinkability: canShrink ? 'ok' : 'with-settings',
                detail: `${info.pageCount}p`,
                reasonKey: !fitsTarget
                  ? 'estimate.cannotFit'
                  : !canShrink
                    ? 'estimate.cannotShrink'
                    : null,
                exact: false,
              },
            })
          }
        } catch {
          if (!controller.signal.aborted) {
            setAsyncState({ key: asyncKey, estimate: EMPTY_ESTIMATE })
          }
        }
      })()
    }, 120)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [asyncKey, picked, maxBytes, options, imageFormat])

  if (syncEstimate !== null) return syncEstimate
  if (asyncKey && asyncState?.key === asyncKey) return asyncState.estimate
  return { ...EMPTY_ESTIMATE, loading: true }
}
