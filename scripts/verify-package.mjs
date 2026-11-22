import { open } from 'yauzl'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const STATIC_SCAN_APIS = {
  storage: 'storage',
  bookmarks: 'bookmarks',
  identity: 'identity',
}

function readEntryUtf8(zip, entry) {
  return new Promise((resolveStream, rejectStream) => {
    zip.openReadStream(entry, (streamError, stream) => {
      if (streamError) { rejectStream(streamError); return }
      const chunks = []
      stream.on('data', chunk => chunks.push(chunk))
      stream.on('error', rejectStream)
      stream.on('end', () => resolveStream(Buffer.concat(chunks).toString('utf8')))
    })
  })
}

export function verifyPackage(path, options = {}) {
  return new Promise((resolveCheck, reject) => {
    open(path, { lazyEntries: true, strictFileNames: true }, (error, zip) => {
      if (error) { reject(error); return }
      const entries = new Set()
      let indexHtml
      let manifestText
      const jsSources = []
      zip.on('error', reject)
      zip.on('entry', entry => {
        entries.add(entry.fileName)
        if (entry.fileName.includes('\\')) { reject(new Error(`Backslash in ZIP entry: ${entry.fileName}`)); zip.close(); return }
        const needsText = entry.fileName === 'index.html' || entry.fileName === 'manifest.json' || (entry.fileName.startsWith('assets/') && entry.fileName.endsWith('.js'))
        if (!needsText) { zip.readEntry(); return }
        readEntryUtf8(zip, entry).then(text => {
          if (entry.fileName === 'index.html') indexHtml = text
          else if (entry.fileName === 'manifest.json') manifestText = text
          else jsSources.push(text)
          zip.readEntry()
        }, reject)
      })
      zip.on('end', () => {
        try {
          if (manifestText === undefined) throw new Error('manifest.json is missing from ZIP root')
          if (indexHtml === undefined) throw new Error('index.html is missing from ZIP root')
          const assets = [...indexHtml.matchAll(/(?:src|href)\s*=\s*["'](?:\.\/|\/)?(assets\/[^"'?#]+)(?:[?#][^"']*)?["']/gi)].map(match => match[1])
          if (!assets.length) throw new Error('index.html does not reference any assets')
          for (const asset of assets) if (!entries.has(asset)) throw new Error(`Missing referenced asset: ${asset}`)
          const manifest = JSON.parse(manifestText)
          const firefox = options.firefox ?? Boolean(manifest.browser_specific_settings?.gecko)
          const namespace = firefox ? 'browser' : 'chrome'
          const declaredPermissions = [...(manifest.permissions ?? []), ...(manifest.optional_permissions ?? [])]
          for (const permission of declaredPermissions) {
            const api = STATIC_SCAN_APIS[permission]
            if (!api) continue
            const literal = `${namespace}.${api}`
            if (!jsSources.some(source => source.includes(literal))) {
              throw new Error(
                `Packaged JS does not contain literal "${literal}" required by store static scans for the "${permission}" permission. `
                + 'Reference it directly through src/platform/extension.ts (extensionStorage / extensionBookmarks / extensionIdentity), not via extensionApi().',
              )
            }
          }
          resolveCheck({ entries: entries.size, assets: assets.length })
        } catch (validationError) { reject(validationError) }
      })
      zip.readEntry()
    })
  })
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const firefox = process.argv[2] === 'firefox'
  const prefix = firefox ? 'promptab-firefox' : 'promptab'
  const manifest = JSON.parse(await readFile(resolve(firefox ? 'dist-firefox/manifest.json' : 'dist/manifest.json'), 'utf8'))
  const archive = resolve('store', `${prefix}-${manifest.version}.zip`)
  const result = await verifyPackage(archive, { firefox })
  console.log(`Verified ${result.entries} ZIP entries and ${result.assets} index assets in ${archive}`)
}
