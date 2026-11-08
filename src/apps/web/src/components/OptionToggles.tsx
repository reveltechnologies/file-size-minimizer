import type { CompressOptions, FileCategory } from '@revel/core'

const STRIP_DETAILS: Record<FileCategory, string> = {
  video: 'GPS location, camera info, gyro/sensor tracks, thumbnails',
  image: 'EXIF, GPS location, camera model and serial',
  pdf: 'Author, software tags, edit history',
}

interface OptionTogglesProps {
  category: FileCategory
  options: CompressOptions
  onChange: (options: CompressOptions) => void
}

export function OptionToggles({ category, options, onChange }: OptionTogglesProps) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
        Options &amp; Privacy
      </legend>
      <Toggle
        label="Strip hidden data & GPS"
        detail={STRIP_DETAILS[category]}
        checked={options.stripHiddenData}
        onChange={(stripHiddenData) => onChange({ ...options, stripHiddenData })}
      />
      {category === 'video' && (
        <>
          <Toggle
            label="Smart visual optimization"
            detail="HDR → SDR, 60 → 30 FPS, auto 1080p / 720p / 480p"
            checked={options.smartOptimize}
            onChange={(smartOptimize) => onChange({ ...options, smartOptimize })}
          />
          <Toggle
            label="Mute audio"
            detail="All the space goes to picture sharpness"
            checked={options.muteAudio}
            onChange={(muteAudio) => onChange({ ...options, muteAudio })}
          />
        </>
      )}
    </fieldset>
  )
}

interface ToggleProps {
  label: string
  detail: string
  checked: boolean
  onChange: (checked: boolean) => void
}

function Toggle({ label, detail, checked, onChange }: ToggleProps) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-3.5 py-3 transition active:scale-[0.99] dark:border-slate-800 dark:bg-slate-800/50">
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-slate-500 dark:text-slate-400">{detail}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-5 shrink-0 accent-blue-600"
      />
    </label>
  )
}
