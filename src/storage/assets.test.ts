// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createAssetLibrary, type AssetRecord, type AssetStore } from './assets'

function memoryStore() {
  let records = new Map<string, AssetRecord>()
  let fail = false
  const store: AssetStore = {
    async transaction(mode, run) {
      const copy = new Map(records)
      const result = await run({
        get: async id => copy.get(id),
        getAll: async () => [...copy.values()],
        put: async record => { copy.set(record.id, record) },
        delete: async id => { copy.delete(id) },
      })
      if (fail) throw new Error('commit failed')
      if (mode === 'readwrite') records = copy
      return result
    },
  }
  return { store, fail: (value: boolean) => { fail = value } }
}

const blob = (s: string) => new Blob([s], { type: 'image/png' })

describe('asset library', () => {
  it('uses SHA-256 references and deduplicates identical content', async () => {
    const db = memoryStore()
    const library = createAssetLibrary(db.store)
    const ref = await library.add(blob('abc'))
    expect(ref).toBe('mnt-asset:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
    expect(await library.add(blob('abc'))).toBe(ref)
    expect((await library.list())).toHaveLength(1)
    expect(await (await library.get(ref))?.text()).toBe('abc')
  })

  it('reconciles all profile and snapshot references and removes orphans', async () => {
    const db = memoryStore()
    const library = createAssetLibrary(db.store)
    const used = await library.add(blob('used'))
    const orphan = await library.add(blob('orphan'))
    await library.reconcile({ profiles: [{ image: used, css: `url(${used})` }], snapshots: [{ nested: [used] }] })
    expect((await library.list()).map(x => [x.id, x.refCount])).toEqual([[used.slice(10), 3]])
    expect(await library.get(orphan)).toBeUndefined()
    await library.reconcile({ profiles: [], snapshots: [{ image: used }] })
    expect((await library.list())[0].refCount).toBe(1)
    await library.reconcile({ profiles: [], snapshots: [] })
    expect(await library.list()).toEqual([])
  })

  it('rejects oversized assets before writing', async () => {
    const library = createAssetLibrary(memoryStore().store, { maxBytes: 2 })
    await expect(library.add(blob('abc'))).rejects.toThrow(/size/i)
    expect(await library.list()).toEqual([])
  })

  it('does not change data when a reconciliation transaction fails', async () => {
    const db = memoryStore()
    const library = createAssetLibrary(db.store)
    const ref = await library.add(blob('kept'))
    await library.reconcile({ profiles: [ref], snapshots: [] })
    db.fail(true)
    await expect(library.reconcile({ profiles: [], snapshots: [] })).rejects.toThrow('commit failed')
    db.fail(false)
    expect((await library.list())[0].refCount).toBe(1)
    expect(await (await library.get(ref))?.text()).toBe('kept')
  })

  it('rejects malformed references and missing assets during reconciliation', async () => {
    const library = createAssetLibrary(memoryStore().store)
    await expect(library.get('mnt-asset:bad')).rejects.toThrow(/reference/i)
    await expect(library.reconcile({ profiles: [`mnt-asset:${'a'.repeat(64)}`], snapshots: [] })).rejects.toThrow(/missing/i)
  })
})
