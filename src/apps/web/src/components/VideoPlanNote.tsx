import { formatBytes, pickOutputSize, type BitratePlan } from '@revel/core'
import { useI18n } from '../lib/i18n'
import type { VideoInfo } from '../lib/probeVideo'
import { WARNING } from './styles'

interface VideoPlanNoteProps {
  info: VideoInfo
  plan: BitratePlan
  maxBytes: number
  smartOptimize: boolean
  allowBlurry: boolean
  onAllowBlurryChange: (allowBlurry: boolean) => void
}

export function VideoPlanNote({
  info,
  plan,
  maxBytes,
  smartOptimize,
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

  const size = smartOptimize ? pickOutputSize(plan.videoKbps, info) : info
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
        <label className="flex cursor-pointer items-center gap-2 font-medium">
          <input
            type="checkbox"
            checked={allowBlurry}
            onChange={(event) => onAllowBlurryChange(event.target.checked)}
            className="size-4 shrink-0 accent-amber-600"
          />
          <span>{t('video.allowLowQuality')}</span>
        </label>
      </div>
    )
  }

  return (
    <p className="text-xs text-slate-500 dark:text-slate-400">
      {duration} · {plan.videoKbps} kbps · {size.width}×{size.height}
    </p>
  )
}

function formatDuration(seconds: number): string {
  const total = Math.round(seconds)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}
