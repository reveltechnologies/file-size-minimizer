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
      className={`flex flex-1 cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed px-5 py-10 text-center transition active:scale-[0.99] focus-within:ring-2 focus-within:ring-emerald-500 ${
        dragging
          ? 'border-emerald-500 bg-emerald-500/10'
          : 'border-[var(--app-border)] bg-[var(--app-card)]'
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
      <span className="flex size-16 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-500">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-8"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        </svg>
      </span>
      <span className="text-base font-bold tracking-tight">{t('dropzone.selectFile')}</span>
      <span className="text-xs text-slate-500 dark:text-slate-400">
        {t('dropzone.supportedTypes')}
      </span>
    </label>
  )
}
