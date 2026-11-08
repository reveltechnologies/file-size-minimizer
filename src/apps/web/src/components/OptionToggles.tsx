import type { CompressOptions, FileCategory } from '@revel/core'

interface OptionTogglesProps {
  category: FileCategory
  options: CompressOptions
  onChange: (options: CompressOptions) => void
}

export function OptionToggles({ category, options, onChange }: OptionTogglesProps) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
        Options
      </legend>
      <Toggle
        label="Remove metadata"
        detail="EXIF, GPS, author"
        checked={options.stripHiddenData}
        onChange={(stripHiddenData) => onChange({ ...options, stripHiddenData })}
      />
      {category === 'video' && (
        <>
          <Toggle
            label="Smart optimize"
            detail="Auto resolution & FPS"
            checked={options.smartOptimize}
            onChange={(smartOptimize) => onChange({ ...options, smartOptimize })}
          />
          <Toggle
            label="Mute audio"
            detail="Remove sound track"
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
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3.5 py-2.5 transition active:scale-[0.99]">
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-slate-500 dark:text-slate-400">{detail}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-5 shrink-0 accent-emerald-600"
      />
    </label>
  )
}
