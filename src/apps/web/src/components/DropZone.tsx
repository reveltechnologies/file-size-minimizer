import { ACCEPTED_EXTENSIONS } from '@revel/core'
import { useState } from 'react'

const ACCEPT = ACCEPTED_EXTENSIONS.map((ext) => `.${ext}`).join(',')

interface DropZoneProps {
  onFiles: (files: File[]) => void
}

export function DropZone({ onFiles }: DropZoneProps) {
  const [dragging, setDragging] = useState(false)

  return (
    <div className="flex flex-1 flex-col justify-between gap-4">
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
        className={`flex flex-1 cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed px-5 py-10 text-center transition active:scale-[0.99] focus-within:ring-2 focus-within:ring-blue-600 ${
          dragging
            ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40'
            : 'border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900'
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
        <span className="flex size-16 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
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
        <div className="space-y-1">
          <span className="block text-lg font-bold tracking-tight">
            Tap to pick a video, photo or PDF
          </span>
          <span className="block text-xs text-slate-500 dark:text-slate-400">
            Select multiple photos to combine them into a single A4 PDF
          </span>
        </div>

        <span className="mt-1 inline-flex items-center rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs">
          Choose from device
        </span>
      </label>

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-2xl border border-slate-200/80 bg-white px-2.5 py-2.5 dark:border-slate-800 dark:bg-slate-900">
          <p className="font-semibold text-slate-800 dark:text-slate-200">Video</p>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">MP4 · MOV · GIF</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white px-2.5 py-2.5 dark:border-slate-800 dark:bg-slate-900">
          <p className="font-semibold text-slate-800 dark:text-slate-200">Photo</p>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">JPG · PNG · HEIC</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white px-2.5 py-2.5 dark:border-slate-800 dark:bg-slate-900">
          <p className="font-semibold text-slate-800 dark:text-slate-200">PDF</p>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Docs &amp; Scans</p>
        </div>
      </div>
    </div>
  )
}
