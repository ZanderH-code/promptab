type SequenceLock = { request(name: string, callback: () => number | Promise<number>): Promise<number> }

const SEQUENCE_KEY = 'mnt:wallpaper:open-sequence:v1'
const SEQUENCE_DB = 'mnt-wallpaper-seq'
const SEQUENCE_STORE = 'seq'

const normalizeSequence = (value: unknown) =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value < Number.MAX_SAFE_INTEGER ? value : 0

/**
 * Increments a single-key counter inside an IndexedDB readwrite transaction so concurrent tabs
 * always see the committed value (Chromium caches `localStorage` per renderer and invalidates it
 * asynchronously across tabs even when wrapped in `navigator.locks`).
 */
function nextIdbSequence(): Promise<number> | null {
  if (typeof indexedDB === 'undefined') return null
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(SEQUENCE_DB, 1)
    open.onupgradeneeded = () => {
      if (!open.result.objectStoreNames.contains(SEQUENCE_STORE)) open.result.createObjectStore(SEQUENCE_STORE)
    }
    open.onerror = () => reject(open.error ?? new Error('Failed to open wallpaper sequence store'))
    open.onsuccess = () => {
      const db = open.result
      let value = 0
      const tx = db.transaction(SEQUENCE_STORE, 'readwrite')
      const store = tx.objectStore(SEQUENCE_STORE)
      const get = store.get('open')
      get.onsuccess = () => {
        value = normalizeSequence(get.result)
        store.put(value + 1, 'open')
      }
      tx.oncomplete = () => { db.close(); resolve(value) }
      tx.onerror = () => { db.close(); reject(tx.error ?? new Error('Wallpaper sequence transaction failed')) }
      tx.onabort = () => { db.close(); reject(tx.error ?? new Error('Wallpaper sequence transaction aborted')) }
    }
  })
}

function nextLocalSequence(): number {
  const current = Number.parseInt(localStorage.getItem(SEQUENCE_KEY) ?? '0', 10)
  const next = normalizeSequence(current)
  localStorage.setItem(SEQUENCE_KEY, String(next + 1))
  return next
}

export async function allocateOpenSequence(locks: SequenceLock | undefined): Promise<number> {
  try {
    if (locks) return await locks.request(SEQUENCE_KEY, async () => {
      const idb = nextIdbSequence()
      if (idb) {
        try { return await idb } catch { /* Fall back to localStorage below. */ }
      }
      return nextLocalSequence()
    })
  } catch { /* Fall back without modifying the shared counter. */ }
  return Math.floor(Math.random() * 0x100000000)
}

export type WallpaperRotation = { images: string[]; interval: 'open' | 'hour' | 'day' }

export function wallpaperRotationIndex(rotation: WallpaperRotation, now = Date.now(), openSequence = 0): number {
  if (!rotation.images.length) return 0
  const date = new Date(now)
  // Local calendar hours and days counted on a continuous scale, so the image changes by one at every boundary
  // (including month and year ends).
  const tick = rotation.interval === 'open' ? openSequence
    : rotation.interval === 'hour'
      ? Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()) / (60 * 60 * 1000))
      : Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / (24 * 60 * 60 * 1000))
  return Math.abs(tick) % rotation.images.length
}
