import { open } from 'yauzl'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export function verifyPackage(path) {
  return new Promise((resolveCheck, reject) => {
    open(path, { lazyEntries: true, strictFileNames: true }, (error, zip) => {
      if (error) { reject(error); return }
      const entries = new Set()
      let indexHtml
      zip.on('error', reject)
      zip.on('entry', entry => {
        entries.add(entry.fileName)
        if (entry.fileName.includes('\\')) { reject(new Error(`Backslash in ZIP entry: ${entry.fileName}`)); zip.close(); return }
        if (entry.fileName !== 'index.html') { zip.readEntry(); return }
        zip.openReadStream(entry, (streamError, stream) => {
          if (streamError) { reject(streamError); return }
          const chunks = []
          stream.on('data', chunk => chunks.push(chunk))
          stream.on('error', reject)
          stream.on('end', () => { indexHtml = Buffer.concat(chunks).toString('utf8'); zip.readEntry() })
        })
      })
      zip.on('end', () => {
        try {
          if (!entries.has('manifest.json')) throw new Error('manifest.json is missing from ZIP root')
          if (indexHtml === undefined) throw new Error('index.html is missing from ZIP root')
          const assets = [...indexHtml.matchAll(/(?:src|href)\s*=\s*["'](?:\.\/|\/)?(assets\/[^"'?#]+)(?:[?#][^"']*)?["']/gi)].map(match => match[1])
          if (!assets.length) throw new Error('index.html does not reference any assets')
          for (const asset of assets) if (!entries.has(asset)) throw new Error(`Missing referenced asset: ${asset}`)
          resolveCheck({ entries: entries.size, assets: assets.length })
        } catch (validationError) { reject(validationError) }
      })
      zip.readEntry()
    })
  })
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const manifest = JSON.parse(await readFile(resolve('dist/manifest.json'), 'utf8'))
  const archive = resolve('store', `promptab-${manifest.version}.zip`)
  const result = await verifyPackage(archive)
  console.log(`Verified ${result.entries} ZIP entries and ${result.assets} index assets in ${archive}`)
}
