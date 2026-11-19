// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Callbacks = { blocking?: () => void; terminated?: () => void }
const opened: { callbacks: Callbacks; db: { close: ReturnType<typeof vi.fn>; closed: boolean; transaction: ReturnType<typeof vi.fn> } }[] = []

vi.mock('idb', () => ({
  openDB: vi.fn(async (_name: string, _version: number, callbacks: Callbacks) => {
    const db = {
      closed: false,
      close: vi.fn(() => { db.closed = true }),
      transaction: vi.fn(() => {
        if (db.closed) throw new DOMException('The database connection is closing.', 'InvalidStateError')
        return { store: { get: async () => undefined }, done: Promise.resolve(), abort: () => {} }
      }),
    }
    opened.push({ callbacks, db })
    return db
  }),
}))

const { closeAssetDatabase, indexedDbAssetStore } = await import('./assets')
const read = () => indexedDbAssetStore.transaction('readonly', tx => tx.get('x'))

describe('asset database connection', () => {
  beforeEach(() => { opened.length = 0 })
  afterEach(() => closeAssetDatabase())

  it('reuses one connection across transactions', async () => {
    await read(); await read(); await Promise.all([read(), read()])
    expect(opened).toHaveLength(1)
    expect(opened[0].db.close).not.toHaveBeenCalled()
  })

  it('closes for a newer version elsewhere and reopens on the next transaction', async () => {
    await read()
    opened[0].callbacks.blocking!()
    await Promise.resolve()
    expect(opened[0].db.close).toHaveBeenCalled()
    await read()
    expect(opened).toHaveLength(2)
  })

  it('reopens after the browser terminates the connection', async () => {
    await read()
    opened[0].callbacks.terminated!()
    await read()
    expect(opened).toHaveLength(2)
  })

  it('reopens once when the cached connection was closed without an event', async () => {
    await read()
    opened[0].db.closed = true
    await read()
    expect(opened).toHaveLength(2)
  })
})
