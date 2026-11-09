import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
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
    // Ignore if browser disallows storing handles.
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

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

async function writeToNativeCache(blob: Blob, fileName: string): Promise<string> {
  const data = await blobToBase64(blob)
  const written = await Filesystem.writeFile({
    path: fileName,
    data,
    directory: Directory.Cache,
  })
  return written.uri
}

function triggerBrowserDownload(blob: Blob, fileName: string): void {
  const safeBlob = new Blob([blob], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(safeBlob)
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
  if (Capacitor.isNativePlatform()) {
    try {
      if (mode !== 'ask') {
        const data = await blobToBase64(blob)
        await Filesystem.writeFile({
          path: `FileSizeMinimizer/${fileName}`,
          data,
          directory: Directory.Documents,
          recursive: true,
        })
        return
      }
    } catch {
      // Fall back to system share/save dialog if Documents write is restricted.
    }
    const uri = await writeToNativeCache(blob, fileName)
    await Share.share({ title: fileName, url: uri })
    return
  }

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
  if (Capacitor.isNativePlatform()) return true
  const file = new File([blob], fileName, { type: blob.type })
  return typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })
}

export async function shareBlob(blob: Blob, fileName: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const uri = await writeToNativeCache(blob, fileName)
    await Share.share({ title: fileName, url: uri })
    return
  }
  const file = new File([blob], fileName, { type: blob.type })
  try {
    await navigator.share({ files: [file] })
  } catch (error) {
    if (!(error instanceof DOMException && error.name === 'AbortError')) throw error
  }
}
