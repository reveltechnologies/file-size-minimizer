import { ACCEPTED_EXTENSIONS } from '@revel/core'
import { useState } from 'react'
import { useI18n } from '../lib/i18n'

const ACCEPT = ACCEPTED_EXTENSIONS.map((ext) => `.${ext}`).join(',')

interface DropZoneProps {
  onFiles: (files: File[]) => void
}

export function DropZone({ onFiles }: DropZoneProps) {
  const { t } = useI18n()
  const [dragging, setDragging] = useState(false)

  return (
    <label
      onDragOver={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        const files = [...event.dataTransfer.files]
        if (files.length > 0) onFiles(files)
      }}
      className={`flex flex-1 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl px-5 py-10 text-center transition-colors focus-within:ring-2 focus-within:ring-[var(--app-accent)] ${
        dragging
          ? 'border-2 border-dashed border-[var(--app-accent)] bg-[var(--app-accent-soft)]'
          : 'border-2 border-transparent'
      }`}
    >
      <input
        type="file"
        accept={ACCEPT}
        multiple
        className="sr-only"
        onChange={(event) => {
          const files = [...(event.target.files ?? [])]
          if (files.length > 0) onFiles(files)
          event.target.value = ''
        }}
      />
      <span className="flex size-12 items-center justify-center rounded-full bg-[var(--app-surface)] text-[var(--app-text-muted)]">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        </svg>
      </span>
      <span className="inline-flex items-center rounded-lg border border-[var(--app-border-strong)] bg-[var(--app-surface)] px-4 py-2 text-sm font-medium text-[var(--app-text)] transition-colors hover:bg-[var(--app-surface-2)]">
        {t('dropzone.selectFile')}
      </span>
      <span className="text-xs text-[var(--app-text-muted)]">
        {t('dropzone.supportedTypes')}
      </span>
    </label>
  )
}
