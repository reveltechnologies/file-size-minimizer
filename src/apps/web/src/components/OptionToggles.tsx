import {
  detectTextSubtype,
  type CompressOptions,
  type FileCategory,
  type ImageFormat,
} from '@revel/core'
import type { ReactNode } from 'react'
import { useI18n } from '../lib/i18n'
import { ImageFormatPicker } from './ImageFormatPicker'
import { DIVIDER_LIST, SELECT_CLASS, segmentClass } from './styles'
import { Switch } from './Switch'

interface OptionTogglesProps {
  category: FileCategory
  options: CompressOptions
  imageFormat?: ImageFormat
  transparent?: boolean | null
  fileName?: string
  onChange: (options: CompressOptions) => void
  onChangeImageFormat?: (format: ImageFormat) => void
}

function getResizeSelectValue(options: CompressOptions): string {
  if (options.imageKeepDimensions) return 'orig'
  if (options.imageScalePercent && options.imageScalePercent < 100) {
    return `pct:${options.imageScalePercent}`
  }
  if (options.imageMaxDimension) {
    return `px:${options.imageMaxDimension}`
  }
  return ''
}

export function OptionToggles({
  category,
  options,
  imageFormat,
  transparent = null,
  fileName = '',
  onChange,
  onChangeImageFormat,
}: OptionTogglesProps) {
  const { t } = useI18n()
  const textSubtype = category === 'text' ? detectTextSubtype(fileName) : null

  function handleResizeChange(value: string) {
    if (!value) {
      onChange({
        ...options,
        imageKeepDimensions: false,
        imageScalePercent: null,
        imageMaxDimension: null,
      })
      return
    }
    if (value === 'orig') {
      onChange({
        ...options,
        imageKeepDimensions: true,
        imageScalePercent: null,
        imageMaxDimension: null,
      })
      return
    }
    const [kind, num] = value.split(':')
    if (kind === 'pct') {
      onChange({
        ...options,
        imageKeepDimensions: false,
        imageScalePercent: Number(num),
        imageMaxDimension: null,
      })
    } else {
      onChange({
        ...options,
        imageKeepDimensions: false,
        imageScalePercent: null,
        imageMaxDimension: Number(num),
      })
    }
  }

  return (
    <div className={DIVIDER_LIST}>
      {category === 'image' && (
        <>
          {imageFormat && onChangeImageFormat && (
            <ImageFormatPicker
              format={imageFormat}
              transparent={transparent}
              onChange={onChangeImageFormat}
            />
          )}

          <ControlRow label={t('options.resize')}>
            <select
              aria-label={t('options.resize')}
              value={getResizeSelectValue(options)}
              onChange={(e) => handleResizeChange(e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="">{t('options.auto')}</option>
              <option value="orig">{t('options.originalSize')}</option>
              <option value="pct:75">75%</option>
              <option value="pct:50">50%</option>
              <option value="pct:25">25%</option>
              <option value="px:1920">1920 px</option>
              <option value="px:1280">1280 px</option>
              <option value="px:800">800 px</option>
              <option value="px:480">480 px</option>
            </select>
          </ControlRow>

          {imageFormat !== 'png' && (
            <ControlRow label={t('options.quality')}>
              <select
                aria-label={t('options.quality')}
                value={options.imageQuality ?? ''}
                onChange={(e) =>
                  onChange({
                    ...options,
                    imageQuality: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className={SELECT_CLASS}
              >
                <option value="">{t('options.auto')}</option>
                <option value="0.85">{t('options.high')}</option>
                <option value="0.7">{t('options.medium')}</option>
                <option value="0.5">{t('options.low')}</option>
                <option value="0.35">{t('options.smallest')}</option>
              </select>
            </ControlRow>
          )}

          <SwitchRow
            label={t('options.grayscale')}
            checked={Boolean(options.imageGrayscale)}
            onChange={(imageGrayscale) => onChange({ ...options, imageGrayscale })}
          />
        </>
      )}

      {category === 'video' && (
        <>
          <ControlRow label={t('options.resolution')}>
            <select
              aria-label={t('options.resolution')}
              value={options.videoMaxHeight ?? ''}
              onChange={(e) =>
                onChange({
                  ...options,
                  videoMaxHeight: e.target.value === '' ? null : Number(e.target.value),
                })
              }
              className={SELECT_CLASS}
            >
              <option value="">{t('options.auto')}</option>
              <option value="0">{t('options.original')}</option>
              <option value="1080">1080p</option>
              <option value="720">720p</option>
              <option value="480">480p</option>
              <option value="360">360p</option>
              <option value="240">240p</option>
            </select>
          </ControlRow>

          <ControlRow label={t('options.fps')}>
            <select
              aria-label={t('options.fps')}
              value={options.videoMaxFps ?? ''}
              onChange={(e) =>
                onChange({
                  ...options,
                  videoMaxFps: e.target.value === '' ? undefined : Number(e.target.value),
                })
              }
              className={SELECT_CLASS}
            >
              <option value="">{t('options.auto')}</option>
              <option value="0">{t('options.original')}</option>
              <option value="30">30 fps</option>
              <option value="24">24 fps</option>
              <option value="15">15 fps</option>
            </select>
          </ControlRow>

          <ControlRow label={t('options.sound')}>
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
                      onChange({
                        ...options,
                        muteAudio: item.kbps === 0,
                        videoAudioKbps: item.kbps,
                      })
                    }
                    className={`${segmentClass(active)} cursor-pointer px-2.5 py-1 text-xs`}
                  >
                    {item.label}
                  </button>
                )
              })}
            </div>
          </ControlRow>
        </>
      )}

      {category === 'pdf' && (
        <>
          <ControlRow label={t('options.pdfImageSize')}>
            <select
              aria-label={t('options.pdfImageSize')}
              value={options.pdfMaxDimension ?? ''}
              onChange={(e) =>
                onChange({
                  ...options,
                  pdfMaxDimension: e.target.value === '' ? null : Number(e.target.value),
                })
              }
              className={SELECT_CLASS}
            >
              <option value="">{t('options.auto')}</option>
              <option value="0">{t('options.original')}</option>
              <option value="1400">{t('options.large')}</option>
              <option value="1000">{t('options.medium')}</option>
              <option value="750">{t('options.small')}</option>
            </select>
          </ControlRow>

          <ControlRow label={t('options.pdfImageQuality')}>
            <select
              aria-label={t('options.pdfImageQuality')}
              value={options.pdfImageQuality ?? ''}
              onChange={(e) =>
                onChange({
                  ...options,
                  pdfImageQuality: e.target.value ? Number(e.target.value) : null,
                })
              }
              className={SELECT_CLASS}
            >
              <option value="">{t('options.auto')}</option>
              <option value="0.75">{t('options.high')}</option>
              <option value="0.55">{t('options.medium')}</option>
              <option value="0.35">{t('options.low')}</option>
            </select>
          </ControlRow>
        </>
      )}

      {category === 'text' && options.textMode !== 'gzip' && (
        <>
          {(textSubtype === 'python' ||
            textSubtype === 'cstyle' ||
            textSubtype === 'markup' ||
            textSubtype === 'css') && (
            <SwitchRow
              label={t('options.stripComments')}
              checked={options.textStripComments !== false}
              onChange={(textStripComments) => onChange({ ...options, textStripComments })}
            />
          )}
          {textSubtype !== 'json' && (
            <SwitchRow
              label={t('options.removeBlankLines')}
              checked={options.textRemoveBlankLines !== false}
              onChange={(textRemoveBlankLines) => onChange({ ...options, textRemoveBlankLines })}
            />
          )}
          {(textSubtype === 'python' || textSubtype === 'cstyle') && (
            <SwitchRow
              label={t('options.compactIndent')}
              checked={options.textCompactIndent !== false}
              onChange={(textCompactIndent) => onChange({ ...options, textCompactIndent })}
            />
          )}
        </>
      )}

      {category !== 'text' && (
        <SwitchRow
          label={t('options.removeMetadata')}
          checked={options.stripHiddenData}
          onChange={(stripHiddenData) => onChange({ ...options, stripHiddenData })}
        />
      )}
    </div>
  )
}

function ControlRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="text-sm text-[var(--app-text)]">{label}</span>
      {children}
    </div>
  )
}

function SwitchRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-2.5">
      <span className="text-sm text-[var(--app-text)]">{label}</span>
      <Switch checked={checked} onChange={onChange} />
    </label>
  )
}
