import { DEFAULT_OPTIONS } from '@revel/core'
import { useState } from 'react'
import {
  clampHistoryLimit,
  DEFAULT_HISTORY_LIMIT,
  MAX_HISTORY_LIMIT,
  MIN_HISTORY_LIMIT,
} from '../lib/historyStore'
import { AVAILABLE_LOCALES, useI18n, type TranslationKey } from '../lib/i18n'
import { canAskSaveLocation, canPickDirectory, pickFixedDirectory } from '../lib/saveFile'
import {
  THEMES,
  type AppSettings,
  type DefaultPhotoFormat,
  type OutputLocationMode,
} from '../lib/settingsStore'
import { APP_VERSION } from '../lib/updateCheck'
import {
  DIVIDER_LIST,
  INPUT_CLASS,
  SECONDARY_BUTTON,
  SECTION_HEAD,
  SELECT_CLASS,
  segmentClass,
} from './styles'
import { Switch } from './Switch'

const GITHUB_REPO_URL = 'https://github.com/reveltechnologies/file-size-minimizer'
const PRIVACY_POLICY_URL =
  'https://github.com/reveltechnologies/file-size-minimizer/blob/main/PRIVACY_POLICY.md'
const SECURITY_POLICY_URL =
  'https://github.com/reveltechnologies/file-size-minimizer/blob/main/SECURITY.md'
const TERMS_OF_USE_URL =
  'https://github.com/reveltechnologies/file-size-minimizer/blob/main/TERMS_OF_USE.md'
const LICENSE_URL = 'https://github.com/reveltechnologies/file-size-minimizer/blob/main/LICENSE'

interface SettingsPanelProps {
  settings: AppSettings
  onChangeSettings: (settings: AppSettings) => void
  storedHistoryCount: number
  onClearAllHistory: () => void
}

export function SettingsPanel({
  settings,
  onChangeSettings,
  storedHistoryCount,
  onClearAllHistory,
}: SettingsPanelProps) {
  const { t } = useI18n()
  const {
    language,
    theme,
    options,
    defaultPhotoFormat,
    rememberHistory,
    historyLimit,
    outputLocationMode,
    fixedFolderName,
    filePrefix,
    fileSuffix,
  } = settings

  const [limitDraft, setLimitDraft] = useState<string | null>(null)

  const allowAsk = canAskSaveLocation()
  const allowFixed = canPickDirectory()
  const locationChoices: { id: OutputLocationMode; labelKey: TranslationKey }[] = [
    { id: 'same', labelKey: 'settings.location.same' },
    ...(allowAsk ? [{ id: 'ask' as const, labelKey: 'settings.location.ask' as const }] : []),
    ...(allowFixed
      ? [{ id: 'fixed' as const, labelKey: 'settings.location.fixed' as const }]
      : []),
  ]
  const activeLocationMode = locationChoices.some((c) => c.id === outputLocationMode)
    ? outputLocationMode
    : 'same'

  const photoFormatChoices: { id: DefaultPhotoFormat; label: string }[] = [
    { id: 'auto', label: t('settings.photoAuto') },
    { id: 'jpeg', label: 'JPG' },
    { id: 'webp', label: 'WebP' },
    { id: 'png', label: 'PNG' },
  ]

  function handleResetDefaults() {
    setLimitDraft(null)
    onChangeSettings({
      ...settings,
      options: { ...DEFAULT_OPTIONS },
      defaultPhotoFormat: 'auto',
      rememberHistory: true,
      historyLimit: DEFAULT_HISTORY_LIMIT,
      outputLocationMode: 'same',
      filePrefix: '',
      fileSuffix: '-fit',
    })
  }

  async function handlePickFolder() {
    const pickedName = await pickFixedDirectory()
    if (pickedName) {
      onChangeSettings({
        ...settings,
        outputLocationMode: 'fixed',
        fixedFolderName: pickedName,
      })
    }
  }

  function handleLimitChange(raw: string) {
    setLimitDraft(raw)
    if (raw === '') return
    const parsed = Number(raw)
    if (!Number.isNaN(parsed) && parsed >= MIN_HISTORY_LIMIT && parsed <= MAX_HISTORY_LIMIT) {
      onChangeSettings({ ...settings, historyLimit: Math.round(parsed) })
    }
  }

  function handleLimitBlur() {
    const parsed = Number(limitDraft)
    const clamped = limitDraft === '' || Number.isNaN(parsed)
      ? historyLimit
      : clampHistoryLimit(parsed)
    setLimitDraft(null)
    if (clamped !== historyLimit) {
      onChangeSettings({ ...settings, historyLimit: clamped })
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 pb-2">
      <section className="flex flex-col gap-2">
        <h2 className={SECTION_HEAD}>{t('settings.language')}</h2>
        <div className="grid grid-cols-2 gap-0.5 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-0.5">
          {AVAILABLE_LOCALES.map((loc) => {
            const active = language === loc.code
            return (
              <button
                key={loc.code}
                type="button"
                aria-pressed={active}
                onClick={() => onChangeSettings({ ...settings, language: loc.code })}
                className={`${segmentClass(active)} cursor-pointer py-2 text-center text-sm`}
              >
                {loc.nativeName}
              </button>
            )
          })}
        </div>
      </section>

      <section className="flex flex-col gap-1.5">
        <h2 className={SECTION_HEAD}>{t('settings.theme')}</h2>
        <div className={DIVIDER_LIST}>
          {THEMES.map((item) => {
            const active = theme === item.id
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={active}
                onClick={() => onChangeSettings({ ...settings, theme: item.id })}
                className="flex w-full cursor-pointer items-center justify-between gap-3 py-2.5 text-left"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    style={{ backgroundColor: item.swatch }}
                    className="size-4 shrink-0 rounded-full border border-[var(--app-border-strong)]"
                  />
                  <span className="truncate text-sm text-[var(--app-text)]">
                    {t(item.labelKey)}
                  </span>
                </span>
                {active && (
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="size-4 shrink-0 text-[var(--app-accent-text)]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        {locationChoices.length > 1 && (
          <>
            <h2 className={SECTION_HEAD}>{t('settings.outputFolder')}</h2>
            <div
              className={`grid gap-0.5 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-0.5 ${
                locationChoices.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
              }`}
            >
              {locationChoices.map((item) => {
                const active = activeLocationMode === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onChangeSettings({ ...settings, outputLocationMode: item.id })}
                    className={`${segmentClass(active)} cursor-pointer text-center`}
                  >
                    {t(item.labelKey)}
                  </button>
                )
              })}
            </div>

            {activeLocationMode === 'fixed' && allowFixed && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  aria-label={t('settings.outputFolder')}
                  value={fixedFolderName}
                  onChange={(e) =>
                    onChangeSettings({ ...settings, fixedFolderName: e.target.value })
                  }
                  className={`${INPUT_CLASS} min-w-0 flex-1 text-sm`}
                />
                <button
                  type="button"
                  onClick={() => void handlePickFolder()}
                  className="shrink-0 cursor-pointer rounded-lg border border-[var(--app-border-strong)] bg-[var(--app-surface)] px-3.5 py-2 text-xs font-medium text-[var(--app-text)] transition-colors hover:bg-[var(--app-surface-2)]"
                >
                  {t('settings.browse')}
                </button>
              </div>
            )}
          </>
        )}

        <div>
          <h3 className={`mb-2 ${SECTION_HEAD}`}>{t('settings.fileNaming')}</h3>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-[var(--app-text-muted)]">
                {t('settings.prefix')}
              </span>
              <input
                type="text"
                placeholder="min_"
                value={filePrefix}
                onChange={(e) => onChangeSettings({ ...settings, filePrefix: e.target.value })}
                className={`${INPUT_CLASS} text-sm`}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-[var(--app-text-muted)]">
                {t('settings.suffix')}
              </span>
              <input
                type="text"
                placeholder="-fit"
                value={fileSuffix}
                onChange={(e) => onChangeSettings({ ...settings, fileSuffix: e.target.value })}
                className={`${INPUT_CLASS} text-sm`}
              />
            </label>
          </div>
          <p className="mt-1.5 truncate font-mono text-xs text-[var(--app-text-muted)]">
            {filePrefix}file{fileSuffix}.mp4
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-1.5">
        <h2 className={SECTION_HEAD}>{t('settings.defaults')}</h2>
        <div className={DIVIDER_LIST}>
          <SettingRow
            label={t('settings.removeMetadata')}
            checked={options.stripHiddenData}
            onChange={(stripHiddenData) =>
              onChangeSettings({ ...settings, options: { ...options, stripHiddenData } })
            }
          />

          <div className="flex items-center justify-between gap-3 py-2.5">
            <span className="text-sm text-[var(--app-text)]">{t('settings.photoFormat')}</span>
            <div className="grid grid-cols-4 gap-0.5 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-0.5">
              {photoFormatChoices.map((item) => {
                const active = defaultPhotoFormat === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onChangeSettings({ ...settings, defaultPhotoFormat: item.id })}
                    className={`${segmentClass(active)} cursor-pointer px-2 py-1 text-xs`}
                  >
                    {item.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 py-2.5">
            <span className="text-sm text-[var(--app-text)]">{t('settings.videoResolution')}</span>
            <select
              aria-label={t('settings.videoResolution')}
              value={options.videoMaxHeight ?? ''}
              onChange={(e) =>
                onChangeSettings({
                  ...settings,
                  options: {
                    ...options,
                    videoMaxHeight: e.target.value === '' ? null : Number(e.target.value),
                  },
                })
              }
              className={SELECT_CLASS}
            >
              <option value="">{t('options.auto')}</option>
              <option value="0">{t('options.original')}</option>
              <option value="1080">1080p</option>
              <option value="720">720p</option>
              <option value="480">480p</option>
            </select>
          </div>

          <div className="flex items-center justify-between gap-3 py-2.5">
            <span className="text-sm text-[var(--app-text)]">{t('settings.videoSound')}</span>
            <div className="grid grid-cols-3 gap-0.5 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-0.5">
              {[
                { kbps: 128, label: t('options.soundNormal') },
                { kbps: 64, label: t('options.soundLow') },
                { kbps: 0, label: t('options.soundOff') },
              ].map((item) => {
                const currentKbps = options.muteAudio ? 0 : (options.videoAudioKbps ?? 128)
                const active = currentKbps === item.kbps
                return (
                  <button
                    key={item.kbps}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      onChangeSettings({
                        ...settings,
                        options: {
                          ...options,
                          muteAudio: item.kbps === 0,
                          videoAudioKbps: item.kbps,
                        },
                      })
                    }
                    className={`${segmentClass(active)} cursor-pointer px-2.5 py-1 text-xs`}
                  >
                    {item.label}
                  </button>
                )
              })}
            </div>
          </div>

          <SettingRow
            label={t('settings.saveRecent')}
            checked={rememberHistory}
            onChange={(checked) => onChangeSettings({ ...settings, rememberHistory: checked })}
          />

          {rememberHistory && (
            <label className="flex items-center justify-between gap-3 py-2.5">
              <span className="text-sm text-[var(--app-text)]">{t('settings.historyLimit')}</span>
              <input
                type="number"
                inputMode="numeric"
                min={MIN_HISTORY_LIMIT}
                max={MAX_HISTORY_LIMIT}
                value={limitDraft ?? String(historyLimit)}
                onChange={(e) => handleLimitChange(e.target.value)}
                onBlur={handleLimitBlur}
                className={`${INPUT_CLASS} h-9 w-20 text-center text-sm tabular-nums`}
              />
            </label>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          {storedHistoryCount > 0 && (
            <button type="button" onClick={onClearAllHistory} className={SECONDARY_BUTTON}>
              {t('settings.clearHistory', { count: storedHistoryCount })}
            </button>
          )}
          <button type="button" onClick={handleResetDefaults} className={SECONDARY_BUTTON}>
            {t('common.reset')}
          </button>
        </div>
      </section>

      <footer className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[var(--app-border)] pt-3 text-xs text-[var(--app-text-muted)]">
        <span>v{APP_VERSION}</span>
        <a
          href={GITHUB_REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[var(--app-text)]"
        >
          GitHub
        </a>
        <a
          href={PRIVACY_POLICY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[var(--app-text)]"
        >
          {t('settings.privacy')}
        </a>
        <a
          href={SECURITY_POLICY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[var(--app-text)]"
        >
          {t('settings.security')}
        </a>
        <a
          href={TERMS_OF_USE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[var(--app-text)]"
        >
          {t('settings.terms')}
        </a>
        <a
          href={LICENSE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[var(--app-text)]"
        >
          GPL-3.0
        </a>
      </footer>
    </div>
  )
}

interface SettingRowProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

function SettingRow({ label, checked, onChange }: SettingRowProps) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-2.5">
      <span className="text-sm text-[var(--app-text)]">{label}</span>
      <Switch checked={checked} onChange={onChange} />
    </label>
  )
}
