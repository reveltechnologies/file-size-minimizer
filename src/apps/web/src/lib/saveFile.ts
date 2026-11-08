export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  // Revoking immediately cancels the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** The phone share sheet (WhatsApp, Discord…). Mostly mobile browsers. */
export function canShareFile(blob: Blob, fileName: string): boolean {
  const file = new File([blob], fileName, { type: blob.type })
  return typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })
}

export async function shareBlob(blob: Blob, fileName: string): Promise<void> {
  const file = new File([blob], fileName, { type: blob.type })
  try {
    await navigator.share({ files: [file] })
  } catch (error) {
    // The user closing the share sheet is not an error.
    if (!(error instanceof DOMException && error.name === 'AbortError')) throw error
  }
}
