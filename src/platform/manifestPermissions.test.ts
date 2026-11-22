import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DRIVE_OPTIONAL_HOSTS, DRIVE_PERMISSIONS, withGoogleDrive } from './driveManifest'

const root = resolve(import.meta.dirname, '../..')
const read = (relativePath: string) => readFileSync(resolve(root, relativePath), 'utf8')

// Reviewed manifest permissions. Adding or changing a permission requires updating
// store/listing.md, store/privacy-policy.md, and docs/privacy/index.html, and calling it out in the PR.
const REVIEWED_PERMISSIONS = ['storage', 'unlimitedStorage', 'favicon']
const REVIEWED_OPTIONAL_PERMISSIONS = ['bookmarks']
const REVIEWED_OPTIONAL_HOSTS = [
  'https://api.anthropic.com/*',
  'https://api.openai.com/*',
  'https://api.open-meteo.com/*',
  'https://geocoding-api.open-meteo.com/*',
  'https://api.bigdatacloud.net/*',
]

describe('manifest permissions and privacy disclosures', () => {
  const manifest = JSON.parse(read('public/manifest.json')) as {
    permissions?: string[]
    optional_permissions?: string[]
    optional_host_permissions?: string[]
    content_security_policy?: { extension_pages?: string }
  }

  it('matches the reviewed permission set so new permissions cannot slip in silently', () => {
    const reminder = 'Update store/listing.md, store/privacy-policy.md, docs/privacy/index.html, and REVIEWED_* in manifestPermissions.test.ts (and note the permission change in the PR).'
    expect(manifest.permissions ?? [], reminder).toEqual(REVIEWED_PERMISSIONS)
    expect(manifest.optional_permissions ?? [], reminder).toEqual(REVIEWED_OPTIONAL_PERMISSIONS)
    expect(manifest.optional_host_permissions ?? [], reminder).toEqual(REVIEWED_OPTIONAL_HOSTS)
  })

  it('documents every optional host and optional permission in the privacy policy and web privacy page', () => {
    const listing = read('store/listing.md')
    const policy = read('store/privacy-policy.md')
    const privacyHtml = read('docs/privacy/index.html')
    const englishSplit = privacyHtml.split('<section id="chinese"')
    expect(englishSplit).toHaveLength(2)
    const [englishHtml, chineseHtml] = englishSplit

    for (const pattern of manifest.optional_host_permissions ?? []) {
      const host = new URL(pattern.replace(/\/\*$/, '')).hostname
      expect(policy, `store/privacy-policy.md must mention ${host}`).toContain(host)
      expect(englishHtml, `docs/privacy/index.html (en) must mention ${host}`).toContain(host)
      expect(chineseHtml, `docs/privacy/index.html (zh-CN) must mention ${host}`).toContain(host)
    }

    for (const permission of manifest.optional_permissions ?? []) {
      expect(listing.toLowerCase(), `store/listing.md must mention ${permission}`).toContain(permission)
      expect(policy, `store/privacy-policy.md must mention ${permission}`).toContain(permission)
      expect(englishHtml, `docs/privacy/index.html (en) must mention ${permission}`).toContain(permission)
      expect(chineseHtml, `docs/privacy/index.html (zh-CN) must mention ${permission}`).toContain(permission)
    }
  })

  it('adds the reviewed Google Drive entries only through withGoogleDrive, and discloses them', () => {
    // Builds without a Google OAuth client ID ship public/manifest.json unchanged (see vite.config.ts).
    expect(DRIVE_PERMISSIONS).toEqual(['identity'])
    expect(DRIVE_OPTIONAL_HOSTS).toEqual(['https://www.googleapis.com/*'])
    const drive = withGoogleDrive(manifest)
    expect(drive.permissions).toEqual([...REVIEWED_PERMISSIONS, 'identity'])
    expect(drive.optional_host_permissions).toEqual([...REVIEWED_OPTIONAL_HOSTS, 'https://www.googleapis.com/*'])
    const [englishHtml, chineseHtml] = read('docs/privacy/index.html').split('<section id="chinese"')
    for (const [name, text] of [['store/listing.md', read('store/listing.md')], ['store/privacy-policy.md', read('store/privacy-policy.md')], ['privacy (en)', englishHtml], ['privacy (zh-CN)', chineseHtml]] as const) {
      for (const term of ['identity', 'www.googleapis.com', 'bookmarksInfo']) expect(text, `${name} must mention ${term}`).toContain(term)
    }
  })

  it('keeps strict MV3 extension CSP (no remote scripts or objects)', () => {
    const csp = manifest.content_security_policy?.extension_pages ?? ''
    expect(csp).toContain("script-src 'self'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).not.toContain('unsafe-eval')
    expect(csp).not.toContain('unsafe-inline')
  })
})
