import { formatBytes, shortSideCap, type BitratePlan } from '@revel/core'
import { useI18n } from '../lib/i18n'
import type { VideoInfo } from '../lib/probeVideo'
import { WARNING } from './styles'

interface VideoPlanNoteProps {
  info: VideoInfo
  plan: BitratePlan
  maxBytes: number
  smartOptimize: boolean
  videoMaxHeight?: number | null
  allowBlurry: boolean
  onAllowBlurryChange: (allowBlurry: boolean) => void
}

export function VideoPlanNote({
  info,
  plan,
  maxBytes,
  smartOptimize,
  videoMaxHeight,
  allowBlurry,
  onAllowBlurryChange,
}: VideoPlanNoteProps) {
  const { t } = useI18n()
  const duration = formatDuration(info.durationSec)

  if (!plan.possible) {
    return (
      <p className={WARNING}>
        {t('video.tooLong', { duration, size: formatBytes(maxBytes) })}
      </p>
    )
  }

  const cap =
    videoMaxHeight === 0
      ? null
      : videoMaxHeight != null
        ? videoMaxHeight
        : smartOptimize
          ? shortSideCap(plan.videoKbps)
          : null
  const scale = cap ? Math.min(1, cap / Math.min(info.width, info.height)) : 1
  const size = {
    width: Math.max(2, Math.floor((info.width * scale) / 2) * 2),
    height: Math.max(2, Math.floor((info.height * scale) / 2) * 2),
  }

  if (!plan.feasible) {
    return (
      <div className={`${WARNING} flex flex-col gap-2`}>
        <p>
          {t('video.lowQuality', {
            kbps: plan.videoKbps,
            width: size.width,
            height: size.height,
          })}
        </p>
        <label className="flex cursor-pointer items-center gap-2 font-medium text-[var(--app-text)]">
          <input
            type="checkbox"
            checked={allowBlurry}
            onChange={(event) => onAllowBlurryChange(event.target.checked)}
            className="size-4 shrink-0 rounded accent-[var(--app-warn)]"
          />
          <span>{t('video.allowLowQuality')}</span>
        </label>
      </div>
    )
  }

  return null
}

function formatDuration(seconds: number): string {
  const total = Math.round(seconds)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}
