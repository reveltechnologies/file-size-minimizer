import { formatBytes, pickOutputSize, type BitratePlan } from '@revel/core'
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
  const duration = formatDuration(info.durationSec)
  const tip = plan.audioKbps > 0 ? 'Mute audio or a bigger target' : 'A bigger target'

  if (!plan.possible) {
    return (
      <p className={WARNING}>
        A {duration} video can't fit under {formatBytes(maxBytes)}, even blurry. {tip} will make it
        fit.
      </p>
    )
  }

  const size = smartOptimize ? pickOutputSize(plan.videoKbps, info) : info
  if (!plan.feasible) {
    return (
      <div className={`${WARNING} flex flex-col gap-3`}>
        <p>
          ⚠ A {duration} video will look <strong>very blurry</strong> under {formatBytes(maxBytes)}:
          only {plan.videoKbps} kbps for the picture, at {size.width}×{size.height}. {tip} gives a
          sharper result.
          {!smartOptimize && ' Turning on Smart visual optimization also helps it fit.'}
        </p>
        <label className="flex cursor-pointer items-center gap-2 font-medium">
          <input
            type="checkbox"
            checked={allowBlurry}
            onChange={(event) => onAllowBlurryChange(event.target.checked)}
            className="size-4 accent-amber-600"
          />
          Shrink anyway, I'm OK with a blurry video
        </label>
      </div>
    )
  }

  return (
    <p className="text-sm text-slate-600 dark:text-slate-400">
      Plan: {duration} at {plan.videoKbps} kbps video
      {plan.audioKbps > 0 ? ` + ${plan.audioKbps} kbps audio` : ', no audio'} · {size.width}×{size.height}
    </p>
  )
}

/** 75.4 → "1:15" */
function formatDuration(seconds: number): string {
  const total = Math.round(seconds)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}
