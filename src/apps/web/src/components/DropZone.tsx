import { ACCEPTED_EXTENSIONS } from '@revel/core'
import { useState } from 'react'

const ACCEPT = ACCEPTED_EXTENSIONS.map((ext) => `.${ext}`).join(',')

interface DropZoneProps {
  onFiles: (files: File[]) => void
}

export function DropZone({ onFiles }: DropZoneProps) {
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
      className={`flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-14 text-center transition focus-within:ring-2 focus-within:ring-blue-600 ${
        dragging
          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40'
          : 'border-slate-300 bg-white hover:border-blue-400 dark:border-slate-700 dark:bg-slate-900'
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
          // Allows picking the same file again after "Shrink another".
          event.target.value = ''
        }}
      />
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-10 text-blue-600"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      </svg>
      <span className="text-lg font-semibold">Drop a video, photo or PDF</span>
      <span className="text-sm text-slate-500 dark:text-slate-400">
        or click to choose · MP4, MOV, WEBM, MKV, GIF, HEIC, WEBP, PNG, JPG, PDF
      </span>
      <span className="text-sm text-slate-500 dark:text-slate-400">
        Pick several photos to combine them into one PDF.
      </span>
    </label>
  )
}
