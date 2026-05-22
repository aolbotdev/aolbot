const BASE_URL = '/api-proxy/partner'
const PINATA_GATEWAY = 'https://gateway.pinata.cloud/ipfs/'

// ── America.Fun API ──────────────────────────────────────────────────────────

async function request(path, body, apiKey) {
  const headers = { 'Content-Type': 'application/json' }
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    let message = `HTTP ${res.status}`
    try {
      const json = JSON.parse(text)
      // try every common field name APIs use for error messages
      message = json.message
        || json.error
        || json.detail
        || json.errors?.[0]?.message
        || json.errors?.[0]
        || (typeof json.errors === 'string' ? json.errors : null)
        || JSON.stringify(json)   // last resort: show full response
        || message
    } catch {
      message = text || message  // show raw body if not JSON
    }
    const err = new Error(message)
    err.status = res.status
    throw err
  }

  return res.json()
}

export async function getFeeEstimate(creator, apiKey) {
  return request('/launch/fee-estimate', { creator }, apiKey)
}

export async function launchToken(payload, apiKey) {
  return request('/launch', payload, apiKey)
}

export async function confirmLaunch(payload, apiKey) {
  return request('/launch/confirm', payload, apiKey)
}

// ── Image → Pinata IPFS (returns https://gateway.pinata.cloud/ipfs/Qm…) ──────
// Platforms like Axiom / GMGM require a real URL, not a base64 data URI.

export async function uploadImageToPinata(file) {
  const jwt = getPinataJwt()

  const formData = new FormData()
  formData.append('file', file, file.name)
  formData.append('pinataMetadata', JSON.stringify({ name: file.name }))
  formData.append('pinataOptions',  JSON.stringify({ cidVersion: 1 }))

  const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}` },
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.reason || `Image upload failed: HTTP ${res.status}`)
  }

  const data = await res.json()
  return `${PINATA_GATEWAY}${data.IpfsHash}`
}

// ── Metadata JSON → Pinata IPFS (developer key, invisible to users) ──────────

function getPinataJwt() {
  const jwt = import.meta.env.VITE_PINATA_JWT
  if (!jwt || jwt.startsWith('paste_your')) {
    throw new Error(
      'Pinata JWT not configured.\n' +
      'Add VITE_PINATA_JWT=your_jwt to the .env file.\n' +
      'Get a free key at https://app.pinata.cloud → API Keys.'
    )
  }
  return jwt
}

export async function uploadMetadata(metadata, symbol) {
  const jwt = getPinataJwt()

  const res = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({
      pinataContent: metadata,
      pinataMetadata: { name: `${symbol || 'token'}-metadata.json` },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.reason || `Metadata upload failed: HTTP ${res.status}`)
  }

  const data = await res.json()
  return `${PINATA_GATEWAY}${data.IpfsHash}`
}
