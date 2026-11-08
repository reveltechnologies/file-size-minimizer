import { DEFAULT_OPTIONS } from '@revel/core'
import {
  DEFAULT_SETTINGS,
  THEMES,
  type AppSettings,
  type DefaultPhotoFormat,
} from '../lib/settingsStore'
import { CARD, choiceClass, SECONDARY_BUTTON } from './styles'

const GITHUB_REPO_URL = 'https://github.com/reveltechnologies/file-size-minimizer'

interface SettingsPanelProps {
  settings: AppSettings
  onChangeSettings: (settings: AppSettings) => void
  storedHistoryCount: number
  onClearAllHistory: () => void
}

const PHOTO_FORMAT_CHOICES: { id: DefaultPhotoFormat; label: string; detail: string }[] = [
  { id: 'auto', label: 'Auto', detail: 'PNG if transparent, else JPG' },
  { id: 'jpeg', label: 'Always JPG', detail: 'Smallest file size' },
  { id: 'png', label: 'Always PNG', detail: 'Lossless pixels' },
]

export function SettingsPanel({
  settings,
  onChangeSettings,
  storedHistoryCount,
  onClearAllHistory,
}: SettingsPanelProps) {
  const { theme, options, defaultPhotoFormat, rememberHistory } = settings

  function handleResetDefaults() {
    onChangeSettings({
      ...DEFAULT_SETTINGS,
      options: { ...DEFAULT_OPTIONS },
    })
  }

  return (
    <div className="flex flex-1 flex-col gap-3.5">
      {/* Theme selection */}
      <section className={`${CARD} flex flex-col gap-3`}>
        <div>
          <h2 className="text-sm font-bold tracking-tight">Appearance &amp; Theme</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Saved automatically on your phone across restarts.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {THEMES.map((item) => {
            const active = theme === item.id
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={active}
                onClick={() => onChangeSettings({ ...settings, theme: item.id })}
                className={choiceClass(active)}
              >
                <span className="flex items-center gap-2 font-semibold">
                  <span
                    aria-hidden="true"
                    style={{ backgroundColor: item.swatch }}
                    className="size-3.5 shrink-0 rounded-full border border-white/30"
                  />
                  <span className="truncate">{item.label}</span>
                </span>
                <span className="mt-0.5 block text-xs opacity-80">{item.detail}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Recent files memory setting */}
      <section className={`${CARD} flex flex-col gap-3`}>
        <div>
          <h2 className="text-sm font-bold tracking-tight">Recent Files History</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Keep your last 10 viewed and last 10 shrunk files on-device to re-download anytime.
          </p>
        </div>

        <SettingRow
          label="Remember last 10 viewed & shrunk files"
          detail="Stored locally on this phone so you can view or download them again"
          checked={rememberHistory}
          onChange={(checked) => onChangeSettings({ ...settings, rememberHistory: checked })}
        />

        {storedHistoryCount > 0 && (
          <button type="button" onClick={onClearAllHistory} className={SECONDARY_BUTTON}>
            Clear saved files ({storedHistoryCount})
          </button>
        )}
      </section>

      {/* Default compression & privacy settings */}
      <section className={`${CARD} flex flex-col gap-3.5`}>
        <div>
          <h2 className="text-sm font-bold tracking-tight">Default Shrink Settings</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Applied automatically whenever you pick a file to shrink.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <SettingRow
            label="Strip hidden data & GPS"
            detail="Remove EXIF location, camera serials, author tags & PDF edit history"
            checked={options.stripHiddenData}
            onChange={(stripHiddenData) =>
              onChangeSettings({ ...settings, options: { ...options, stripHiddenData } })
            }
          />
          <SettingRow
            label="Smart video optimization"
            detail="Convert HDR → SDR, 60 → 30 FPS, and auto-scale resolution when needed"
            checked={options.smartOptimize}
            onChange={(smartOptimize) =>
              onChangeSettings({ ...settings, options: { ...options, smartOptimize } })
            }
          />
          <SettingRow
            label="Mute video audio by default"
            detail="Give 100% of the target file size budget to video sharpness"
            checked={options.muteAudio}
            onChange={(muteAudio) =>
              onChangeSettings({ ...settings, options: { ...options, muteAudio } })
            }
          />
        </div>

        <fieldset>
          <legend className="mb-2 text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
            Default photo output
          </legend>
          <div className="grid grid-cols-3 gap-2">
            {PHOTO_FORMAT_CHOICES.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={defaultPhotoFormat === item.id}
                onClick={() => onChangeSettings({ ...settings, defaultPhotoFormat: item.id })}
                className={choiceClass(defaultPhotoFormat === item.id)}
              >
                <span className="block text-xs font-semibold">{item.label}</span>
                <span className="mt-0.5 block text-[11px] leading-tight opacity-80">
                  {item.detail}
                </span>
              </button>
            ))}
          </div>
        </fieldset>

        <button type="button" onClick={handleResetDefaults} className={SECONDARY_BUTTON}>
          Restore default settings
        </button>
      </section>

      {/* Open Source & 100% Local Privacy info */}
      <section className={`${CARD} flex flex-col gap-2.5 text-xs text-slate-600 dark:text-slate-300`}>
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-slate-900 dark:text-white">
            Open-Source &amp; 100% Local
          </span>
          <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-emerald-500">
            v0.5.0-beta.1
          </span>
        </div>
        <p className="leading-relaxed">
          🔒 This app is completely <strong>open-source</strong> and runs{' '}
          <strong>100% locally on your device</strong>. No files, text, metadata, or analytics are
          ever sent to any external server.
        </p>
        <a
          href={GITHUB_REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-0.5 flex items-center justify-between gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3.5 py-2.5 font-semibold text-emerald-600 transition active:scale-[0.99] dark:text-emerald-400"
        >
          <span className="truncate">github.com/reveltechnologies/file-size-minimizer</span>
          <span aria-hidden="true" className="shrink-0">
            ↗
          </span>
        </a>
      </section>
    </div>
  )
}

interface SettingRowProps {
  label: string
  detail: string
  checked: boolean
  onChange: (checked: boolean) => void
}

function SettingRow({ label, detail, checked, onChange }: SettingRowProps) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3.5 py-3 transition active:scale-[0.99]">
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">
          {label}
        </span>
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
