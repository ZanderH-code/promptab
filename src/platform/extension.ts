export type ExtensionStorageArea = {
  get(keys: string | string[] | null): Promise<Record<string, unknown>>
  set(items: Record<string, unknown>): Promise<void>
  remove?(keys: string | string[]): Promise<void>
  getKeys?(): Promise<string[]>
}
export type ExtensionPermissions = {
  request(details: { permissions?: string[]; origins?: string[]; data_collection?: Array<'authenticationInfo' | 'personalCommunications' | 'locationInfo'> }): Promise<boolean>
  contains?(details: { permissions?: string[]; origins?: string[] }): Promise<boolean>
}
export type ExtensionApi = {
  runtime?: { getURL(path: string): string }
  storage?: {
    local?: ExtensionStorageArea
    sync?: ExtensionStorageArea
    onChanged?: {
      addListener(listener: (changes: Record<string, unknown>, area: string) => void): void
      removeListener(listener: (changes: Record<string, unknown>, area: string) => void): void
    }
  }
  permissions?: ExtensionPermissions
  bookmarks?: { getTree(): Promise<unknown[]> }
}

/** The extension globals, typed only as far as Promptab uses them. */
declare const browser: ExtensionApi | undefined
declare const chrome: ExtensionApi | undefined

/**
 * The extension's storage areas. Spelled out as `browser.storage.*` / `chrome.storage.*` rather than reached through
 * extensionApi(), because store review statically scans the bundle for the APIs behind each permission: the
 * indirect lookup minified to `e.chrome` and the Chrome Web Store rejected `storage` as "requested but not used".
 */
export function extensionStorage(): ExtensionApi['storage'] {
  if (typeof browser !== 'undefined' && browser?.storage) return { local: browser.storage.local, sync: browser.storage.sync, onChanged: browser.storage.onChanged }
  if (typeof chrome !== 'undefined' && chrome?.storage) return { local: chrome.storage.local, sync: chrome.storage.sync, onChanged: chrome.storage.onChanged }
  return undefined
}

/**
 * The bookmarks API, spelled out for the same static review. Chromium only defines it once the optional
 * `bookmarks` permission is granted, so look it up after the request, not before.
 */
export function extensionBookmarks(): ExtensionApi['bookmarks'] {
  if (typeof browser !== 'undefined' && browser?.bookmarks) return browser.bookmarks
  if (typeof chrome !== 'undefined' && chrome?.bookmarks) return { getTree: () => chrome!.bookmarks!.getTree() }
  return undefined
}

/** Firefox exposes `browser`; Chromium exposes `chrome`. Both implement promise-based MV3 APIs. */
export function extensionApi(): ExtensionApi | undefined {
  const globals = globalThis as typeof globalThis & { browser?: ExtensionApi; chrome?: ExtensionApi }
  return globals.browser ?? globals.chrome
}

export function isExtensionEnvironment(): boolean {
  return typeof extensionApi()?.runtime?.getURL === 'function'
}

/** Chromium 156 also exposes `browser`, so the runtime URL scheme is the only reliable signal. */
export function isFirefoxExtension(): boolean {
  try { return !!extensionApi()?.runtime?.getURL('/')?.startsWith('moz-extension:') } catch { return false }
}
