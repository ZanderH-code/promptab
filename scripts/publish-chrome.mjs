import { createSign } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export const CHROME_WEB_STORE_SCOPE = 'https://www.googleapis.com/auth/chromewebstore'
export const CHROME_API_BASE = 'https://chromewebstore.googleapis.com'
export const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token'
export const CRX_UPDATE_URL = 'https://clients2.google.com/service/update2/crx'

const ALLOWED_PUBLISH_TYPES = new Set(['DEFAULT_PUBLISH', 'STAGED_PUBLISH'])

function base64Url(input) {
  return Buffer.from(input).toString('base64url')
}

export function parseServiceAccountJson(raw) {
  const trimmed = String(raw ?? '').trim()
  if (!trimmed) throw new Error('CHROME_WEB_STORE_SERVICE_ACCOUNT_JSON is empty')

  let parsed
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    try {
      parsed = JSON.parse(Buffer.from(trimmed, 'base64').toString('utf8'))
    } catch {
      throw new Error('CHROME_WEB_STORE_SERVICE_ACCOUNT_JSON must be valid JSON or base64-encoded JSON')
    }
  }

  if (typeof parsed?.client_email !== 'string' || typeof parsed?.private_key !== 'string') {
    throw new Error('Service account JSON must contain string fields "client_email" and "private_key"')
  }

  return {
    client_email: parsed.client_email,
    private_key: parsed.private_key.replace(/\\n/g, '\n'),
    token_uri: typeof parsed.token_uri === 'string' && parsed.token_uri ? parsed.token_uri : OAUTH_TOKEN_URL,
  }
}

export function createServiceAccountJwt(serviceAccount, nowSec = Math.floor(Date.now() / 1000)) {
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = base64Url(
    JSON.stringify({
      iss: serviceAccount.client_email,
      scope: CHROME_WEB_STORE_SCOPE,
      aud: serviceAccount.token_uri || OAUTH_TOKEN_URL,
      iat: nowSec,
      exp: nowSec + 3600,
    }),
  )
  const unsigned = `${header}.${payload}`
  const signer = createSign('RSA-SHA256')
  signer.update(unsigned)
  signer.end()
  const signature = signer.sign(serviceAccount.private_key).toString('base64url')
  return `${unsigned}.${signature}`
}

export async function getAccessToken(env, fetchImpl = fetch) {
  const serviceAccountRaw = env.CHROME_WEB_STORE_SERVICE_ACCOUNT_JSON?.trim()
  const clientId = env.CHROME_WEB_STORE_CLIENT_ID?.trim()
  const clientSecret = env.CHROME_WEB_STORE_CLIENT_SECRET?.trim()
  const refreshToken = env.CHROME_WEB_STORE_REFRESH_TOKEN?.trim()

  let tokenUrl = OAUTH_TOKEN_URL
  let form

  if (serviceAccountRaw) {
    const serviceAccount = parseServiceAccountJson(serviceAccountRaw)
    tokenUrl = serviceAccount.token_uri
    const assertion = createServiceAccountJwt(serviceAccount)
    form = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    })
  } else if (clientId && clientSecret && refreshToken) {
    form = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    })
  } else {
    throw new Error(
      'Missing Chrome Web Store credentials. Configure either CHROME_WEB_STORE_SERVICE_ACCOUNT_JSON '
      + '(recommended for Chrome Web Store API v2) or all three of CHROME_WEB_STORE_CLIENT_ID, '
      + 'CHROME_WEB_STORE_CLIENT_SECRET, and CHROME_WEB_STORE_REFRESH_TOKEN.',
    )
  }

  const response = await fetchImpl(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  })
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500)
    throw new Error(`Google OAuth token endpoint returned ${response.status}: ${detail}`)
  }
  const data = await response.json()
  if (typeof data?.access_token !== 'string' || !data.access_token) {
    throw new Error('Google OAuth token response did not include an access_token')
  }
  return data.access_token
}

export function parseCrxUpdateVersion(xml) {
  const tag = String(xml ?? '').match(/<updatecheck\b[^>]*>/i)?.[0]
  if (!tag) return null
  return tag.match(/\bversion="([^"]+)"/)?.[1] ?? null
}

export async function checkPublicListingVersion({ itemId, version, fetchImpl = fetch, log = console }) {
  if (!itemId || !version) return
  try {
    const xParam = encodeURIComponent(`id=${itemId}&v=0.0.0.0&uc`)
    const url = `${CRX_UPDATE_URL}?x=${xParam}&prodversion=130.0&acceptformat=crx2,crx3`
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(15_000) })
    if (!response.ok) return
    const liveVersion = parseCrxUpdateVersion(await response.text())
    if (liveVersion) {
      log.log(`Public Chrome Web Store listing version: ${liveVersion} (target: ${version})`)
      if (liveVersion === version) {
        throw new Error(
          `Version ${version} is already live in Chrome Web Store; bump the release version before publishing again.`,
        )
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('already live')) throw error
    log.warn(
      `Could not read public Chrome Web Store listing version (${error instanceof Error ? error.message : String(error)}); continuing.`,
    )
  }
}

export function buildPublishBody({ publishType = 'DEFAULT_PUBLISH', skipReview = false, deployPercentage = '' } = {}) {
  const normalizedType = publishType || 'DEFAULT_PUBLISH'
  if (!ALLOWED_PUBLISH_TYPES.has(normalizedType)) {
    throw new Error(`Unsupported CHROME_WEB_STORE_PUBLISH_TYPE "${normalizedType}". Expected DEFAULT_PUBLISH or STAGED_PUBLISH.`)
  }
  const body = { publishType: normalizedType }
  if (skipReview === true || skipReview === 'true') {
    body.skipReview = true
  }
  const rawPct = String(deployPercentage ?? '').trim()
  if (rawPct !== '') {
    if (!/^\d+$/.test(rawPct)) {
      throw new Error(`Invalid CHROME_WEB_STORE_DEPLOY_PERCENTAGE "${rawPct}". Expected an integer from 1 to 100.`)
    }
    const pct = Number(rawPct)
    if (pct < 1 || pct > 100) {
      throw new Error(`Invalid CHROME_WEB_STORE_DEPLOY_PERCENTAGE "${rawPct}". Expected an integer from 1 to 100.`)
    }
    body.deployInfos = [{ deployPercentage: pct }]
  }
  return body
}

function channelVersions(revisionStatus) {
  const channels = Array.isArray(revisionStatus?.distributionChannels) ? revisionStatus.distributionChannels : []
  return channels.map(channel => channel?.crxVersion).filter(v => typeof v === 'string' && v.length > 0)
}

export async function publishChromeExtension(env, options = {}) {
  const {
    fetchImpl = fetch,
    readFileImpl = readFile,
    sleepImpl = ms => new Promise(resolveSleep => setTimeout(resolveSleep, ms)),
    pollIntervalMs = 10_000,
    maxPollAttempts = 90,
    log = console,
  } = options

  const publisherId = env.CHROME_WEB_STORE_PUBLISHER_ID?.trim()
  const itemId = env.CHROME_WEB_STORE_ITEM_ID?.trim()
  const version = env.CHROME_WEB_STORE_VERSION?.trim()

  if (!publisherId || !itemId || !version) {
    throw new Error('Missing CHROME_WEB_STORE_PUBLISHER_ID, CHROME_WEB_STORE_ITEM_ID, or CHROME_WEB_STORE_VERSION')
  }

  const publishBody = buildPublishBody({
    publishType: env.CHROME_WEB_STORE_PUBLISH_TYPE?.trim(),
    skipReview: env.CHROME_WEB_STORE_SKIP_REVIEW?.trim(),
    deployPercentage: env.CHROME_WEB_STORE_DEPLOY_PERCENTAGE,
  })

  await checkPublicListingVersion({ itemId, version, fetchImpl, log })

  const accessToken = await getAccessToken(env, fetchImpl)
  const resource = `publishers/${encodeURIComponent(publisherId)}/items/${encodeURIComponent(itemId)}`
  const authHeaders = { Authorization: `Bearer ${accessToken}` }

  async function apiRequest(url, init = {}) {
    const response = await fetchImpl(url, {
      ...init,
      headers: { ...authHeaders, ...init.headers },
    })
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500)
      throw new Error(`Chrome Web Store API returned ${response.status}: ${detail}`)
    }
    return response.json()
  }

  const statusUrl = `${CHROME_API_BASE}/v2/${resource}:fetchStatus`
  const currentStatus = await apiRequest(statusUrl, { method: 'GET' })

  const publishedVersions = channelVersions(currentStatus.publishedItemRevisionStatus)
  const submittedState = currentStatus.submittedItemRevisionStatus?.state
  const submittedVersions = channelVersions(currentStatus.submittedItemRevisionStatus)

  log.log(
    `Chrome Web Store status: published=${currentStatus.publishedItemRevisionStatus?.state ?? 'NONE'}`
    + `${publishedVersions.length ? ` (${publishedVersions.join(', ')})` : ''}, `
    + `submitted=${submittedState ?? 'NONE'}`
    + `${submittedVersions.length ? ` (${submittedVersions.join(', ')})` : ''}`,
  )

  if (publishedVersions.includes(version)) {
    throw new Error(
      `Version ${version} is already published in Chrome Web Store; bump the release version before publishing again.`,
    )
  }
  if (submittedState === 'PENDING_REVIEW') {
    throw new Error(
      `Chrome Web Store already has a submission in PENDING_REVIEW${submittedVersions.length ? ` (${submittedVersions.join(', ')})` : ''}. `
      + 'Wait for review to finish or cancel the pending submission before publishing again.',
    )
  }

  const packagePath = `store/promptab-${version}.zip`
  const packageBytes = await readFileImpl(packagePath)

  log.log(`Uploading extension package ${packagePath}`)
  const uploadUrl = `${CHROME_API_BASE}/upload/v2/${resource}:upload`
  const uploadResult = await apiRequest(uploadUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/zip' },
    body: packageBytes,
  })

  let uploadState = uploadResult.uploadState
  log.log(`Package upload: ${uploadState ?? 'unknown'}${uploadResult.crxVersion ? ` (crxVersion=${uploadResult.crxVersion})` : ''}`)

  if (uploadState === 'IN_PROGRESS' || uploadState === 'UPLOAD_IN_PROGRESS') {
    for (let attempt = 1; attempt <= maxPollAttempts; attempt += 1) {
      await sleepImpl(pollIntervalMs)
      const polled = await apiRequest(statusUrl, { method: 'GET' })
      uploadState = polled.lastAsyncUploadState
      log.log(`Package upload: ${uploadState ?? 'unknown'} (check ${attempt}/${maxPollAttempts})`)
      if (uploadState === 'SUCCEEDED') break
      if (uploadState === 'FAILED' || uploadState === 'NOT_FOUND') {
        throw new Error(`Chrome Web Store async package upload failed with state ${uploadState}`)
      }
    }
  }

  if (uploadState !== 'SUCCEEDED') {
    throw new Error(`Chrome Web Store package upload did not succeed (state: ${uploadState ?? 'unknown'})`)
  }

  if (uploadResult.crxVersion && uploadResult.crxVersion !== version) {
    throw new Error(
      `Uploaded package version (${uploadResult.crxVersion}) does not match target CHROME_WEB_STORE_VERSION (${version})`,
    )
  }

  log.log(`Submitting extension update for publishing (publishType=${publishBody.publishType})`)
  const publishUrl = `${CHROME_API_BASE}/v2/${resource}:publish`
  const publishResult = await apiRequest(publishUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(publishBody),
  })

  const state = publishResult.state ?? 'unknown'
  log.log(`Store submission: ${state}`)

  const warnings = publishResult.warningInfo?.warnings
  if (Array.isArray(warnings) && warnings.length > 0) {
    for (const warning of warnings) {
      log.warn(`Chrome Web Store warning: ${JSON.stringify(warning)}`)
    }
  }

  if (state === 'REJECTED' || state === 'CANCELLED') {
    throw new Error(`Chrome Web Store publish failed with state ${state}: ${JSON.stringify(publishResult)}`)
  }

  log.log('Extension update was submitted successfully')
  return { upload: uploadResult, publish: publishResult }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await publishChromeExtension(process.env)
}
