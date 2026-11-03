import { afterEach, describe, expect, it } from 'vitest'
import { extensionApi, isExtensionEnvironment, isFirefoxExtension } from './extension'

const restore = () => {
  delete (globalThis as typeof globalThis & { browser?: unknown }).browser
  delete (globalThis as typeof globalThis & { chrome?: unknown }).chrome
}
afterEach(restore)

describe('extension API selection', () => {
  it('prefers Firefox browser APIs when both namespaces exist', () => {
    const browser = { storage: { sync: {} } }
    Object.defineProperty(globalThis, 'browser', { configurable: true, value: browser })
    Object.defineProperty(globalThis, 'chrome', { configurable: true, value: { storage: { local: {} } } })
    expect(extensionApi()).toBe(browser)
    expect(isFirefoxExtension()).toBe(true)
  })

  it('uses Chromium APIs when the browser namespace is absent', () => {
    const chrome = { storage: { local: {} } }
    Object.defineProperty(globalThis, 'chrome', { configurable: true, value: chrome })
    expect(extensionApi()).toBe(chrome)
    expect(isFirefoxExtension()).toBe(false)
  })

  it('detects the extension runtime separately from browser API shims', () => {
    Object.defineProperty(globalThis, 'chrome', { configurable: true, value: { permissions: {} } })
    expect(extensionApi()).toBeDefined()
    expect(isExtensionEnvironment()).toBe(false)
    Object.defineProperty(globalThis, 'chrome', { configurable: true, value: { runtime: { getURL: () => 'extension:///' } } })
    expect(isExtensionEnvironment()).toBe(true)
  })

  it('returns no extension API in a regular web preview', () => {
    expect(extensionApi()).toBeUndefined()
    expect(isExtensionEnvironment()).toBe(false)
    expect(isFirefoxExtension()).toBe(false)
  })
})
