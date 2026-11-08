import type { OutputLocationMode } from './settingsStore'

interface WritableWindow extends Window {
  showSaveFilePicker?: (options?: {
    suggestedName?: string
    startIn?: FileSystemHandle | 'downloads' | 'documents' | 'desktop'
  }) => Promise<FileSystemFileHandle>
  showDirectoryPicker?: (options?: {
    mode?: 'read' | 'readwrite'
  }) => Promise<FileSystemDirectoryHandle>
}

const HANDLE_DB = 'fsm-handles-db'
const HANDLE_STORE = 'handles'
const FIXED_DIR_KEY = 'fixed-output-dir'

function openHandleDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'))
      return
    }
    const req = indexedDB.open(HANDLE_DB, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(HANDLE_STORE)) {
        req.result.createObjectStore(HANDLE_STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function saveDirHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  try {
    const db = await openHandleDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(HANDLE_STORE, 'readwrite')
      tx.objectStore(HANDLE_STORE).put(handle, FIXED_DIR_KEY)
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => {
        db.close()
        reject(tx.error)
      }
    })
  } catch {
    // Ignore if browser disallow storing handles.
  }
}

async function loadDirHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openHandleDb()
    return await new Promise<FileSystemDirectoryHandle | null>((resolve) => {
      const tx = db.transaction(HANDLE_STORE, 'readonly')
      const req = tx.objectStore(HANDLE_STORE).get(FIXED_DIR_KEY)
      req.onsuccess = () => resolve((req.result as FileSystemDirectoryHandle) ?? null)
      req.onerror = () => resolve(null)
      tx.oncomplete = () => db.close()
    })
  } catch {
    return null
  }
}

export async function pickFixedDirectory(): Promise<string | null> {
  const win = window as WritableWindow
  if (typeof win.showDirectoryPicker !== 'function') {
    return null
  }
  try {
    const handle = await win.showDirectoryPicker({ mode: 'readwrite' })
    await saveDirHandle(handle)
    return handle.name
  } catch {
    return null
  }
}

function triggerBrowserDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export async function downloadBlob(
  blob: Blob,
  fileName: string,
  mode: OutputLocationMode = 'same',
): Promise<void> {
  const win = window as WritableWindow

  if (mode === 'ask' && typeof win.showSaveFilePicker === 'function') {
    try {
      const fileHandle = await win.showSaveFilePicker({ suggestedName: fileName })
      const writable = await fileHandle.createWritable()
      await writable.write(blob)
      await writable.close()
      return
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
    }
  }

  if (mode === 'fixed') {
    try {
      let dirHandle = await loadDirHandle()
      if (!dirHandle && typeof win.showDirectoryPicker === 'function') {
        dirHandle = await win.showDirectoryPicker({ mode: 'readwrite' })
        await saveDirHandle(dirHandle)
      }
      if (dirHandle) {
        const fileHandle = await dirHandle.getFileHandle(fileName, { create: true })
        const writable = await fileHandle.createWritable()
        await writable.write(blob)
        await writable.close()
        return
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
    }
  }

  triggerBrowserDownload(blob, fileName)
}

export function canShareFile(blob: Blob, fileName: string): boolean {
  const file = new File([blob], fileName, { type: blob.type })
  return typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })
}

export async function shareBlob(blob: Blob, fileName: string): Promise<void> {
  const file = new File([blob], fileName, { type: blob.type })
  try {
    await navigator.share({ files: [file] })
  } catch (error) {
    if (!(error instanceof DOMException && error.name === 'AbortError')) throw error
  }
}
