import { DEFAULT_OPTIONS } from '@revel/core'
import {
  AVAILABLE_LOCALES,
  useI18n,
  type TranslationKey,
} from '../lib/i18n'
import { pickFixedDirectory } from '../lib/saveFile'
import {
  THEMES,
  type AppSettings,
  type DefaultPhotoFormat,
  type OutputLocationMode,
} from '../lib/settingsStore'
import { CARD, choiceClass, SECONDARY_BUTTON, SUBTLE_BOX } from './styles'

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

const LOCATION_CHOICES: { id: OutputLocationMode; labelKey: TranslationKey }[] = [
  { id: 'same', labelKey: 'settings.location.same' },
  { id: 'ask', labelKey: 'settings.location.ask' },
  { id: 'fixed', labelKey: 'settings.location.fixed' },
]

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
    outputLocationMode,
    fixedFolderName,
    filePrefix,
    fileSuffix,
  } = settings

  const photoFormatChoices: { id: DefaultPhotoFormat; label: string; detail: string }[] = [
    { id: 'auto', label: t('settings.photoAuto'), detail: t('settings.photoAutoDetail') },
    { id: 'jpeg', label: 'JPG', detail: t('format.smaller') },
    { id: 'png', label: 'PNG', detail: t('format.transparent') },
  ]

  function handleResetDefaults() {
    onChangeSettings({
      ...settings,
      options: { ...DEFAULT_OPTIONS },
      defaultPhotoFormat: 'auto',
      rememberHistory: true,
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

  return (
    <div className="flex flex-1 flex-col gap-3">
      <section className={`${CARD} flex flex-col gap-2.5`}>
        <h2 className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
          {t('settings.language')}
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {AVAILABLE_LOCALES.map((loc) => {
            const active = language === loc.code
            return (
              <button
                key={loc.code}
                type="button"
                aria-pressed={active}
                onClick={() => onChangeSettings({ ...settings, language: loc.code })}
                className={`${choiceClass(active)} flex min-h-11 items-center justify-between px-3 py-2 text-xs font-semibold`}
              >
                <span className="truncate">{loc.nativeName}</span>
                <span className="font-mono text-[10px] uppercase opacity-75">{loc.code}</span>
              </button>
            )
          })}
        </div>
      </section>

      <section className={`${CARD} flex flex-col gap-2.5`}>
        <h2 className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
          {t('settings.theme')}
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {THEMES.map((item) => {
            const active = theme === item.id
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={active}
                onClick={() => onChangeSettings({ ...settings, theme: item.id })}
                className="flex min-h-11 items-center gap-2.5 rounded-2xl border px-3 py-2 text-left text-xs font-semibold transition active:scale-[0.98]"
                style={
                  active
                    ? {
                        borderColor: '#10b981',
                        backgroundColor: '#059669',
                        color: '#ffffff',
                      }
                    : {
                        borderColor: 'var(--app-border)',
                        backgroundColor: 'var(--app-subtle)',
                      }
                }
              >
                <span
                  aria-hidden="true"
                  style={{ backgroundColor: item.swatch }}
                  className="size-3.5 shrink-0 rounded-full border border-white/30"
                />
                <span className="truncate">{t(item.labelKey)}</span>
              </button>
            )
          })}
        </div>
      </section>

      <section className={`${CARD} flex flex-col gap-3`}>
        <h2 className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
          {t('settings.outputFolder')}
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {LOCATION_CHOICES.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={outputLocationMode === item.id}
              onClick={() => onChangeSettings({ ...settings, outputLocationMode: item.id })}
              className={`${choiceClass(outputLocationMode === item.id)} flex min-h-11 items-center justify-center px-2 py-2 text-center text-xs font-semibold`}
            >
              {t(item.labelKey)}
            </button>
          ))}
        </div>

        {outputLocationMode === 'fixed' && (
          <div className={`${SUBTLE_BOX} flex items-center justify-between gap-2 px-3 py-2`}>
            <div className="flex min-w-0 items-center gap-2 text-xs">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="size-4 shrink-0 text-emerald-500"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              <input
                type="text"
                aria-label={t('settings.outputFolder')}
                value={fixedFolderName}
                onChange={(e) =>
                  onChangeSettings({ ...settings, fixedFolderName: e.target.value })
                }
                className="min-w-0 flex-1 bg-transparent font-medium outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => void handlePickFolder()}
              className="shrink-0 rounded-xl bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white active:scale-95"
            >
              {t('settings.browse')}
            </button>
          </div>
        )}

        <h2 className="pt-1 text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
          {t('settings.fileNaming')}
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {t('settings.prefix')}
            </span>
            <input
              type="text"
              placeholder="min_"
              value={filePrefix}
              onChange={(e) => onChangeSettings({ ...settings, filePrefix: e.target.value })}
              className={`${SUBTLE_BOX} px-3 py-2 text-xs font-medium outline-none`}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {t('settings.suffix')}
            </span>
            <input
              type="text"
              placeholder="-fit"
              value={fileSuffix}
              onChange={(e) => onChangeSettings({ ...settings, fileSuffix: e.target.value })}
              className={`${SUBTLE_BOX} px-3 py-2 text-xs font-medium outline-none`}
            />
          </label>
        </div>
        <p className="truncate font-mono text-[11px] text-slate-500 dark:text-slate-400">
          {filePrefix}file{fileSuffix}.mp4
        </p>
      </section>

      <section className={`${CARD} flex flex-col gap-2.5`}>
        <h2 className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
          {t('settings.defaults')}
        </h2>
        <SettingRow
          label={t('settings.removeMetadata')}
          checked={options.stripHiddenData}
          onChange={(stripHiddenData) =>
            onChangeSettings({ ...settings, options: { ...options, stripHiddenData } })
          }
        />
        <SettingRow
          label={t('settings.smartVideoOptimize')}
          checked={options.smartOptimize}
          onChange={(smartOptimize) =>
            onChangeSettings({ ...settings, options: { ...options, smartOptimize } })
          }
        />
        <SettingRow
          label={t('settings.muteVideoAudio')}
          checked={options.muteAudio}
          onChange={(muteAudio) =>
            onChangeSettings({ ...settings, options: { ...options, muteAudio } })
          }
        />
        <SettingRow
          label={t('settings.saveLast10')}
          checked={rememberHistory}
          onChange={(checked) => onChangeSettings({ ...settings, rememberHistory: checked })}
        />

        <div className={`${SUBTLE_BOX} flex flex-col gap-2 p-3`}>
          <div className="flex items-center gap-2 text-xs font-medium">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-4 shrink-0 text-emerald-500"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
            <span>{t('settings.photoFormat')}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {photoFormatChoices.map((item) => {
              const active = defaultPhotoFormat === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChangeSettings({ ...settings, defaultPhotoFormat: item.id })}
                  className={`flex flex-col items-center justify-center rounded-xl border px-2 py-2 text-center transition active:scale-[0.98] ${
                    active
                      ? 'border-emerald-500 bg-emerald-600 text-white shadow-xs'
                      : 'border-[var(--app-border)] bg-[var(--app-card)] text-slate-900 dark:text-slate-100'
                  }`}
                >
                  <span className="text-xs font-semibold">{item.label}</span>
                  <span className="text-[10px] opacity-80">{item.detail}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          {storedHistoryCount > 0 && (
            <button
              type="button"
              onClick={onClearAllHistory}
              className={`${SECONDARY_BUTTON} py-2.5 text-xs`}
            >
              {t('settings.clearHistory', { count: storedHistoryCount })}
            </button>
          )}
          <button
            type="button"
            onClick={handleResetDefaults}
            className={`${SECONDARY_BUTTON} py-2.5 text-xs`}
          >
            {t('common.reset')}
          </button>
        </div>
      </section>

      <section className={`${CARD} flex flex-col gap-2.5 text-xs`}>
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="font-semibold">{t('settings.openSourceLocal')}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {t('settings.noExternalData')} · v1.0.0
            </p>
          </div>
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub Repository"
            title="GitHub"
            className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-[var(--app-border)] bg-[var(--app-subtle)] text-emerald-500 active:scale-95"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4.5" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
          </a>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-0.5 text-center font-medium">
          <a
            href={PRIVACY_POLICY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`${SUBTLE_BOX} flex items-center justify-center gap-1.5 py-2 text-xs active:scale-95`}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-3.5 text-emerald-500"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>{t('settings.privacy')}</span>
          </a>
          <a
            href={SECURITY_POLICY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`${SUBTLE_BOX} flex items-center justify-center gap-1.5 py-2 text-xs active:scale-95`}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-3.5 text-emerald-500"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>{t('settings.security')}</span>
          </a>
          <a
            href={TERMS_OF_USE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`${SUBTLE_BOX} flex items-center justify-center gap-1.5 py-2 text-xs active:scale-95`}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-3.5 text-emerald-500"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6M16 13H8M16 17H8" />
            </svg>
            <span>{t('settings.terms')}</span>
          </a>
          <a
            href={LICENSE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`${SUBTLE_BOX} flex items-center justify-center gap-1.5 py-2 text-xs active:scale-95`}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-3.5 text-emerald-500"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M14.83 14.83a4 4 0 1 1 0-5.66" />
            </svg>
            <span>GPL-3.0</span>
          </a>
        </div>
      </section>
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
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-3.5 py-2.5 transition active:scale-[0.99]">
      <span className="text-xs font-medium">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4.5 shrink-0 accent-emerald-600"
      />
    </label>
  )
}
