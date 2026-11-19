import { afterEach, expect, it, vi } from 'vitest'
import { downloadJson, REVOKE_DELAY_MS } from './download'

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

it('downloads pretty JSON and revokes the blob URL only after a delay', async () => {
  vi.useFakeTimers()
  const create = vi.fn((_blob: Blob) => 'blob:test')
  const revoke = vi.fn()
  vi.stubGlobal('URL', Object.assign(Object.create(URL), { createObjectURL: create, revokeObjectURL: revoke }))
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  downloadJson({ a: 1 }, 'theme.json')
  const link = click.mock.instances[0] as unknown as HTMLAnchorElement
  expect(link.download).toBe('theme.json')
  expect(link.getAttribute('href')).toBe('blob:test')
  expect(revoke).not.toHaveBeenCalled()
  vi.advanceTimersByTime(REVOKE_DELAY_MS)
  expect(revoke).toHaveBeenCalledWith('blob:test')
  vi.useRealTimers()
  const blob = create.mock.calls[0][0] as Blob
  expect(blob.type).toBe('application/json')
  const text = await new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsText(blob) })
  expect(text).toBe('{\n  "a": 1\n}')
})
