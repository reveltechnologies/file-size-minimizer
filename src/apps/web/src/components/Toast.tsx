interface ToastProps {
  message: string | null
}

export function Toast({ message }: ToastProps) {
  if (!message) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-16 z-30 flex justify-center px-4"
    >
      <span className="rounded-lg border border-[var(--app-border-strong)] bg-[var(--app-surface-2)] px-3.5 py-1.5 text-xs font-medium text-[var(--app-text)] shadow-md">
        {message}
      </span>
    </div>
  )
}
