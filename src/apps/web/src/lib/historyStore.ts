export type HistoryBucket = 'viewed' | 'shrunk'

export interface HistoryEntry {
  id: string
  bucket: HistoryBucket
  fileName: string
  mimeType: string
  size: number
  originalSize?: number
  timestamp: number
  blob: Blob
}

export const DEFAULT_HISTORY_LIMIT = 10
export const MIN_HISTORY_LIMIT = 1
export const MAX_HISTORY_LIMIT = 50

export function clampHistoryLimit(limit: number): number {
  if (!Number.isFinite(limit)) return DEFAULT_HISTORY_LIMIT
  return Math.min(MAX_HISTORY_LIMIT, Math.max(MIN_HISTORY_LIMIT, Math.round(limit)))
}

const DB_NAME = 'file-size-minimizer-db'
const DB_VERSION = 1
const STORE_NAME = 'file_history'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('bucket', 'bucket', { unique: false })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'))
  })
}

export async function listHistory(
  bucket: HistoryBucket,
  limit = DEFAULT_HISTORY_LIMIT,
): Promise<HistoryEntry[]> {
  const safeLimit = clampHistoryLimit(limit)
  try {
    const db = await openDb()
    return await new Promise<HistoryEntry[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const index = store.index('bucket')
      const req = index.getAll(bucket)
      req.onsuccess = () => {
        const items = (req.result as HistoryEntry[]) ?? []
        items.sort((a, b) => b.timestamp - a.timestamp)
        resolve(items.slice(0, safeLimit))
      }
      req.onerror = () => reject(req.error)
      tx.oncomplete = () => db.close()
    })
  } catch {
    return []
  }
}

export async function addHistoryEntry(
  entry: Omit<HistoryEntry, 'id' | 'timestamp'>,
  limit = DEFAULT_HISTORY_LIMIT,
): Promise<HistoryEntry[]> {
  const safeLimit = clampHistoryLimit(limit)
  try {
    const db = await openDb()
    const existing = await listHistory(entry.bucket, MAX_HISTORY_LIMIT)
    const duplicate = existing.find(
      (item) => item.fileName === entry.fileName && item.size === entry.size,
    )
    const newEntry: HistoryEntry = {
      ...entry,
      id:
        duplicate?.id ??
        `${entry.bucket}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
    }

    const updated = [newEntry, ...existing.filter((item) => item.id !== newEntry.id)]
    const toKeep = updated.slice(0, safeLimit)
    const toRemove = updated.slice(safeLimit)

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      store.put(newEntry)
      for (const old of toRemove) {
        store.delete(old.id)
      }
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => {
        db.close()
        reject(tx.error)
      }
    })

    return toKeep
  } catch {
    return []
  }
}

export async function trimHistory(limit: number): Promise<void> {
  const safeLimit = clampHistoryLimit(limit)
  try {
    const [viewed, shrunk] = await Promise.all([
      listHistory('viewed', MAX_HISTORY_LIMIT),
      listHistory('shrunk', MAX_HISTORY_LIMIT),
    ])
    const toDelete = [...viewed.slice(safeLimit), ...shrunk.slice(safeLimit)]
    if (toDelete.length === 0) return

    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      for (const item of toDelete) {
        store.delete(item.id)
      }
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
    // Ignore errors when IndexedDB is unavailable.
  }
}

export async function clearHistory(bucket?: HistoryBucket): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      if (!bucket) {
        store.clear()
      } else {
        const index = store.index('bucket')
        const req = index.getAllKeys(bucket)
        req.onsuccess = () => {
          for (const key of req.result) {
            store.delete(key)
          }
        }
      }
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
    // Ignore errors when IndexedDB is unavailable.
  }
}
