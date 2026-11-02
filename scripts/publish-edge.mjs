const { EDGE_ADDONS_CLIENT_ID: clientId, EDGE_ADDONS_API_KEY: apiKey, EDGE_ADDONS_PRODUCT_ID: productId, EDGE_ADDONS_PUBLISH_NOTES: notes = 'Update submitted through GitHub Actions' } = process.env

if (!clientId || !apiKey || !productId) {
  throw new Error('Missing EDGE_ADDONS_CLIENT_ID, EDGE_ADDONS_API_KEY, or EDGE_ADDONS_PRODUCT_ID')
}

const api = 'https://api.addons.microsoftedge.microsoft.com/v1'
const headers = {
  Authorization: `ApiKey ${apiKey}`,
  'X-ClientID': clientId,
}

async function request(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { ...headers, ...options.headers } })
  if (!response.ok && response.status !== 202) {
    const detail = (await response.text()).slice(0, 500)
    throw new Error(`Edge Add-ons API returned ${response.status}: ${detail}`)
  }
  return response
}

function operationId(response) {
  const location = response.headers.get('location')
  if (!location) throw new Error('Edge Add-ons API response did not include an operation location')
  return new URL(location, api).pathname.split('/').filter(Boolean).at(-1)
}

async function waitForOperation(url, label) {
  for (let attempt = 1; attempt <= 90; attempt += 1) {
    const response = await request(url)
    const result = await response.json()
    const status = result.status
    console.log(`${label}: ${status ?? 'unknown'} (check ${attempt}/90)`)
    if (status === 'Succeeded') return result
    if (status === 'Failed') throw new Error(`${label} failed: ${JSON.stringify(result.errors ?? result)}`)
    await new Promise(resolve => setTimeout(resolve, 10_000))
  }
  throw new Error(`${label} did not finish within 15 minutes`)
}

const base = `${api}/products/${encodeURIComponent(productId)}/submissions`
const packagePath = `store/promptab-${process.env.EDGE_ADDONS_VERSION}.zip`
const packageBytes = await (await import('node:fs/promises')).readFile(packagePath)

console.log(`Uploading extension package ${packagePath}`)
const upload = await request(`${base}/draft/package`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/zip' },
  body: packageBytes,
})
await waitForOperation(`${base}/draft/package/operations/${operationId(upload)}`, 'Package upload')

console.log('Submitting extension update for certification')
const publish = await request(base, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ notes }),
})
await waitForOperation(`${base}/operations/${operationId(publish)}`, 'Store submission')
console.log('Extension update was submitted successfully')
