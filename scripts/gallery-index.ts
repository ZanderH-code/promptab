import { resolve } from 'node:path'
import { syncGalleryIndex } from './gallery-index-lib'

const check = process.argv.includes('--check')
const { count } = await syncGalleryIndex(resolve('docs/gallery'), { check })
console.log(`Validated ${count} gallery packs${check ? ' and index' : '; index generated'}.`)
