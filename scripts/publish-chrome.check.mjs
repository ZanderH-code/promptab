import assert from 'node:assert/strict'
import { createVerify, generateKeyPairSync } from 'node:crypto'
import { test } from 'node:test'
import {
  CHROME_WEB_STORE_SCOPE,
  buildPublishBody,
  createServiceAccountJwt,
  parseCrxUpdateVersion,
  parseServiceAccountJson,
  publishChromeExtension,
} from './publish-chrome.mjs'

const noopLog = { log() {}, warn() {} }

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function makeTestServiceAccount() {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
  return {
    publicKey,
    account: {
      client_email: 'publisher@test-project.iam.gserviceaccount.com',
      private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
      token_uri: 'https://oauth2.googleapis.com/token',
    },
  }
}

test('parseCrxUpdateVersion reads version from Chrome update XML', () => {
  const xml = '<?xml version="1.0"?><gupdate><app appid="abc" status="ok"><updatecheck status="ok" version="0.23.1"/></app></gupdate>'
  assert.equal(parseCrxUpdateVersion(xml), '0.23.1')
  assert.equal(parseCrxUpdateVersion('<gupdate><app status="noupdate"/></gupdate>'), null)
})

test('createServiceAccountJwt signs a valid RS256 assertion and parseServiceAccountJson accepts raw or base64', () => {
  const { publicKey, account } = makeTestServiceAccount()
  const raw = JSON.stringify(account)
  const parsedRaw = parseServiceAccountJson(raw)
  const parsedB64 = parseServiceAccountJson(Buffer.from(raw).toString('base64'))
  assert.equal(parsedRaw.client_email, account.client_email)
  assert.equal(parsedB64.client_email, account.client_email)

  const jwt = createServiceAccountJwt(parsedRaw, 1_700_000_000)
  const [encodedHeader, encodedPayload, encodedSig] = jwt.split('.')
  const header = JSON.parse(Buffer.from(encodedHeader, 'base64url').toString('utf8'))
  const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'))
  assert.deepEqual(header, { alg: 'RS256', typ: 'JWT' })
  assert.equal(payload.iss, account.client_email)
  assert.equal(payload.scope, CHROME_WEB_STORE_SCOPE)
  assert.equal(payload.aud, account.token_uri)
  assert.equal(payload.iat, 1_700_000_000)
  assert.equal(payload.exp, 1_700_003_600)

  const verifier = createVerify('RSA-SHA256')
  verifier.update(`${encodedHeader}.${encodedPayload}`)
  verifier.end()
  assert.equal(verifier.verify(publicKey, Buffer.from(encodedSig, 'base64url')), true)
})

test('buildPublishBody validates publishType, skipReview, and deployPercentage', () => {
  assert.deepEqual(buildPublishBody({}), { publishType: 'DEFAULT_PUBLISH' })
  assert.deepEqual(
    buildPublishBody({ publishType: 'STAGED_PUBLISH', skipReview: 'true', deployPercentage: '25' }),
    { publishType: 'STAGED_PUBLISH', skipReview: true, deployInfos: [{ deployPercentage: 25 }] },
  )
  assert.throws(() => buildPublishBody({ publishType: 'UNKNOWN' }), /Unsupported CHROME_WEB_STORE_PUBLISH_TYPE/)
  assert.throws(() => buildPublishBody({ deployPercentage: '0' }), /Invalid CHROME_WEB_STORE_DEPLOY_PERCENTAGE/)
  assert.throws(() => buildPublishBody({ deployPercentage: '101' }), /Invalid CHROME_WEB_STORE_DEPLOY_PERCENTAGE/)
})

test('publishChromeExtension uploads and publishes using Service Account auth', async () => {
  const { account } = makeTestServiceAccount()
  const calls = []
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url, method: init.method ?? 'GET', headers: init.headers, body: init.body })
    if (url.startsWith('https://clients2.google.com/service/update2/crx')) {
      return new Response('<gupdate><app><updatecheck version="0.23.1"/></app></gupdate>', { status: 200 })
    }
    if (url === 'https://oauth2.googleapis.com/token') {
      assert.match(String(init.body), /grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer/)
      return jsonResponse({ access_token: 'sa-access-token' })
    }
    if (url.endsWith(':fetchStatus')) {
      return jsonResponse({
        publishedItemRevisionStatus: {
          state: 'PUBLISHED',
          distributionChannels: [{ crxVersion: '0.23.1', deployPercentage: 100 }],
        },
      })
    }
    if (url.endsWith(':upload')) {
      assert.equal(init.headers.Authorization, 'Bearer sa-access-token')
      assert.equal(init.headers['Content-Type'], 'application/zip')
      assert.deepEqual(init.body, Buffer.from('fake-zip-bytes'))
      return jsonResponse({ uploadState: 'SUCCEEDED', crxVersion: '0.24.0', itemId: 'aeiigkihjpgggiohlfcglacilnllmboi' })
    }
    if (url.endsWith(':publish')) {
      assert.deepEqual(JSON.parse(init.body), { publishType: 'DEFAULT_PUBLISH' })
      return jsonResponse({ state: 'PENDING_REVIEW', itemId: 'aeiigkihjpgggiohlfcglacilnllmboi' })
    }
    throw new Error(`Unexpected URL: ${url}`)
  }

  const result = await publishChromeExtension(
    {
      CHROME_WEB_STORE_PUBLISHER_ID: 'pub-123',
      CHROME_WEB_STORE_ITEM_ID: 'aeiigkihjpgggiohlfcglacilnllmboi',
      CHROME_WEB_STORE_VERSION: '0.24.0',
      CHROME_WEB_STORE_SERVICE_ACCOUNT_JSON: JSON.stringify(account),
    },
    {
      fetchImpl,
      readFileImpl: async path => {
        assert.equal(path, 'store/promptab-0.24.0.zip')
        return Buffer.from('fake-zip-bytes')
      },
      log: noopLog,
    },
  )

  assert.equal(result.upload.uploadState, 'SUCCEEDED')
  assert.equal(result.publish.state, 'PENDING_REVIEW')
  assert.equal(calls.length, 5)
})

test('publishChromeExtension supports OAuth refresh token and polls async uploads', async () => {
  let statusCalls = 0
  const fetchImpl = async (url, init = {}) => {
    if (url.startsWith('https://clients2.google.com/service/update2/crx')) {
      return new Response('', { status: 404 })
    }
    if (url === 'https://oauth2.googleapis.com/token') {
      assert.match(String(init.body), /grant_type=refresh_token/)
      return jsonResponse({ access_token: 'oauth-access-token' })
    }
    if (url.endsWith(':fetchStatus')) {
      statusCalls += 1
      if (statusCalls === 1) return jsonResponse({ publishedItemRevisionStatus: { state: 'PUBLISHED', distributionChannels: [{ crxVersion: '0.23.1' }] } })
      if (statusCalls === 2) return jsonResponse({ lastAsyncUploadState: 'IN_PROGRESS' })
      return jsonResponse({ lastAsyncUploadState: 'SUCCEEDED' })
    }
    if (url.endsWith(':upload')) {
      return jsonResponse({ uploadState: 'IN_PROGRESS' })
    }
    if (url.endsWith(':publish')) {
      assert.deepEqual(JSON.parse(init.body), {
        publishType: 'STAGED_PUBLISH',
        deployInfos: [{ deployPercentage: 50 }],
      })
      return jsonResponse({ state: 'STAGED' })
    }
    throw new Error(`Unexpected URL: ${url}`)
  }

  const result = await publishChromeExtension(
    {
      CHROME_WEB_STORE_PUBLISHER_ID: 'pub-123',
      CHROME_WEB_STORE_ITEM_ID: 'aeiigkihjpgggiohlfcglacilnllmboi',
      CHROME_WEB_STORE_VERSION: '0.24.0',
      CHROME_WEB_STORE_CLIENT_ID: 'client-id',
      CHROME_WEB_STORE_CLIENT_SECRET: 'client-secret',
      CHROME_WEB_STORE_REFRESH_TOKEN: 'refresh-token',
      CHROME_WEB_STORE_PUBLISH_TYPE: 'STAGED_PUBLISH',
      CHROME_WEB_STORE_DEPLOY_PERCENTAGE: '50',
    },
    {
      fetchImpl,
      readFileImpl: async () => Buffer.from('zip'),
      sleepImpl: async () => {},
      pollIntervalMs: 0,
      log: noopLog,
    },
  )

  assert.equal(statusCalls, 3)
  assert.equal(result.publish.state, 'STAGED')
})

test('publishChromeExtension blocks duplicate live versions and active PENDING_REVIEW submissions', async () => {
  const { account } = makeTestServiceAccount()
  const baseEnv = {
    CHROME_WEB_STORE_PUBLISHER_ID: 'pub-123',
    CHROME_WEB_STORE_ITEM_ID: 'aeiigkihjpgggiohlfcglacilnllmboi',
    CHROME_WEB_STORE_VERSION: '0.24.0',
    CHROME_WEB_STORE_SERVICE_ACCOUNT_JSON: JSON.stringify(account),
  }

  await assert.rejects(
    publishChromeExtension(baseEnv, {
      fetchImpl: async () => new Response('<gupdate><app><updatecheck version="0.24.0"/></app></gupdate>', { status: 200 }),
      log: noopLog,
    }),
    /already live in Chrome Web Store/,
  )

  await assert.rejects(
    publishChromeExtension(baseEnv, {
      fetchImpl: async url => {
        if (url.startsWith('https://clients2.google.com/')) return new Response('', { status: 404 })
        if (url === 'https://oauth2.googleapis.com/token') return jsonResponse({ access_token: 'tok' })
        if (url.endsWith(':fetchStatus')) {
          return jsonResponse({
            submittedItemRevisionStatus: {
              state: 'PENDING_REVIEW',
              distributionChannels: [{ crxVersion: '0.23.9' }],
            },
          })
        }
        throw new Error(`Should not proceed past fetchStatus: ${url}`)
      },
      log: noopLog,
    }),
    /already has a submission in PENDING_REVIEW/,
  )
})

test('publishChromeExtension rejects missing configuration cleanly', async () => {
  await assert.rejects(
    publishChromeExtension({}, { log: noopLog }),
    /Missing CHROME_WEB_STORE_PUBLISHER_ID/,
  )
  await assert.rejects(
    publishChromeExtension(
      {
        CHROME_WEB_STORE_PUBLISHER_ID: 'pub-123',
        CHROME_WEB_STORE_ITEM_ID: 'aeiigkihjpgggiohlfcglacilnllmboi',
        CHROME_WEB_STORE_VERSION: '0.24.0',
      },
      {
        fetchImpl: async () => new Response('', { status: 404 }),
        log: noopLog,
      },
    ),
    /Missing Chrome Web Store credentials/,
  )
})
