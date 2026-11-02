export type ExtensionStorageArea = {
  get(keys: string | string[] | null): Promise<Record<string, unknown>>
  set(items: Record<string, unknown>): Promise<void>
  remove?(keys: string | string[]): Promise<void>
  getKeys?(): Promise<string[]>
}
export type ExtensionPermissions = {
  request(details: { permissions?: string[]; origins?: string[]; data_collection?: Array<'authenticationInfo' | 'personalCommunications'> }): Promise<boolean>
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

/** Firefox exposes `browser`; Chromium exposes `chrome`. Both implement promise-based MV3 APIs. */
export function extensionApi(): ExtensionApi | undefined {
  const globals = globalThis as typeof globalThis & { browser?: ExtensionApi; chrome?: ExtensionApi }
  return globals.browser ?? globals.chrome
}

export function isFirefoxExtension(): boolean {
  return typeof (globalThis as typeof globalThis & { browser?: ExtensionApi }).browser !== 'undefined'
}
