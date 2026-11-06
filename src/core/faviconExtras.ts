import { browserFaviconUrl } from './favicon'
import { extensionApi } from '../platform/extension'
import { loadImage, type CandidateSource, type FaviconCandidate } from './faviconQuality'
import { knownIconFor } from './knownIcons'
import { knownBrand } from './knownBrands'

/** Share of pixels that may differ from their block's first pixel before a block grid is considered real detail. */
export const ICON_UPSCALE_TOLERANCE = 0.02
const CHANNEL_TOLERANCE = 8

/** Official icon URLs from the bundled known-site table. Cross-origin URLs are listed there explicitly. */
export function sources(input: string): CandidateSource[] {
  return (knownIconFor(input)?.urls ?? []).map(url => ({ url, sourceType: 'known', svg: /\.svg(?:[?#]|$)/i.test(url) }))
}

export function isDefaultGlobeFingerprint(actual: string, defaults: Set<string>) { return defaults.has(actual) }

/**
 * Measures whether a bitmap is an f×f uniform block upscale of a smaller source. A block grid only counts
 * when detail appears at twice that scale, so genuinely flat icons are not mistaken for upscaled ones.
 */
export function estimateEffectiveWidth(pixels: Uint8ClampedArray | number[], width: number, height: number) {
  if (width < 4 || height < 4 || pixels.length < width * height * 4) return width
  const differing = (factor: number) => {
    if (width % factor || height % factor) return 1
    let count = 0
    for (let by = 0; by < height; by += factor) {
      for (let bx = 0; bx < width; bx += factor) {
        const base = (by * width + bx) * 4
        for (let y = by; y < by + factor; y++) {
          for (let x = bx; x < bx + factor; x++) {
            if (x === bx && y === by) continue
            const index = (y * width + x) * 4
            if (Math.abs(pixels[index]! - pixels[base]!) > CHANNEL_TOLERANCE || Math.abs(pixels[index + 1]! - pixels[base + 1]!) > CHANNEL_TOLERANCE || Math.abs(pixels[index + 2]! - pixels[base + 2]!) > CHANNEL_TOLERANCE || Math.abs(pixels[index + 3]! - pixels[base + 3]!) > CHANNEL_TOLERANCE) count++
          }
        }
      }
    }
    return count / (width * height)
  }
  for (const factor of [8, 4, 2]) {
    if (width % factor || height % factor || width % (factor * 2) || height % (factor * 2)) continue
    if (differing(factor) <= ICON_UPSCALE_TOLERANCE && differing(factor * 2) > ICON_UPSCALE_TOLERANCE) return width / factor
  }
  return width
}

function read(image: HTMLImageElement) {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return null
    context.drawImage(image, 0, 0)
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
    let hash = 2166136261
    let transparent = true
    for (let i = 0; i < pixels.length; i += 4) {
      hash = Math.imul(hash ^ pixels[i]!, 16777619)
      hash = Math.imul(hash ^ pixels[i + 1]!, 16777619)
      hash = Math.imul(hash ^ pixels[i + 2]!, 16777619)
      hash = Math.imul(hash ^ pixels[i + 3]!, 16777619)
      if (pixels[i + 3] !== 0) transparent = false
    }
    return { hash: `${canvas.width}x${canvas.height}:${(hash >>> 0).toString(16)}`, transparent, pixels }
  } catch {
    // Cross-origin pixels without CORS cannot be read. The image can still be displayed.
    return null
  }
}

let globeHashes: Promise<Set<string>> | null = null
/** Loads the default globe fingerprints before probing starts, so no image slot waits on another. */
export async function prepare() {
  if (!globeHashes) {
    const api = extensionApi()
    const url = `https://promptab-${Math.random().toString(36).slice(2)}.invalid/`
    const urls = [browserFaviconUrl(url, api, false, 128), browserFaviconUrl(url, api, false, 64)].filter((value): value is string => !!value)
    globeHashes = Promise.all(urls.map(async source => {
      const image = await loadImage(source)
      return image ? read(image)?.hash ?? null : null
    })).then(hashes => new Set(hashes.filter((hash): hash is string => !!hash)))
  }
  await globeHashes
}

export async function inspect(image: HTMLImageElement) {
  const pixels = read(image)
  if (!pixels) return { transparent: false, placeholder: false, effectiveWidth: image.naturalWidth }
  return {
    transparent: pixels.transparent,
    placeholder: isDefaultGlobeFingerprint(pixels.hash, await globeHashes!),
    effectiveWidth: estimateEffectiveWidth(pixels.pixels, image.naturalWidth, image.naturalHeight),
  }
}

function brandCandidate(slug: string): FaviconCandidate | null {
  const brand = knownBrand(slug)
  return brand ? { url: '', sourceType: 'known-brand', naturalWidth: 0, naturalHeight: 0, effectiveWidth: Number.POSITIVE_INFINITY, clarity: 'clear', svg: true, brand } : null
}

/** A missing, blurry or brand-preferred result becomes the bundled mark; everything else keeps the image. */
export function resolveIconResult(best: FaviconCandidate | null, input: string, displaySize = 64, dpr = 1): FaviconCandidate | null {
  const known = knownIconFor(input)
  if (!known?.brand || best?.brand) return best
  const sharp = !!best && (best.svg || best.effectiveWidth >= Math.ceil(displaySize * dpr))
  return known.preferBrand || !sharp ? brandCandidate(known.brand) : best
}

export function brand(slug: string) { return brandCandidate(slug) }
