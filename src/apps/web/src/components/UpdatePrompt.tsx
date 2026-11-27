import { useEffect } from 'react'
import { useI18n } from '../lib/i18n'
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from './styles'

interface UpdatePromptProps {
  onDismiss: () => void
  onUpdate: () => void
}

export function UpdatePrompt({ onDismiss, onUpdate }: UpdatePromptProps) {
  const { t } = useI18n()

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onDismiss()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onDismiss])

  return (
    <div
      data-no-swipe="true"
      onClick={onDismiss}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="update-prompt-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xs rounded-xl border border-[var(--app-border-strong)] bg-[var(--app-surface)] p-5 shadow-lg"
      >
        <h2 id="update-prompt-title" className="text-base font-semibold text-[var(--app-text)]">
          {t('update.title')}
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--app-text-muted)]">
          {t('update.message')}
        </p>
        <div className="mt-5 flex items-center gap-2.5">
          <button
            type="button"
            onClick={onDismiss}
            className={`${SECONDARY_BUTTON} h-10 flex-1`}
          >
            {t('update.notNow')}
          </button>
          <button
            type="button"
            onClick={onUpdate}
            className={`${PRIMARY_BUTTON} h-10 flex-1 text-sm`}
          >
            {t('update.action')}
          </button>
        </div>
      </div>
    </div>
  )
}
