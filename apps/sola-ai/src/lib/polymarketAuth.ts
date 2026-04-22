import { fetchWithTimeout } from '@sola-ai/utils'
import { get as idbGet, set as idbSet, del as idbDel, keys as idbKeys } from 'idb-keyval'

const CREDS_KEY_PREFIX_V1 = 'polymarket_creds_v1:'
const CREDS_KEY_PREFIX = 'polymarket_creds_v2:'
const ENCRYPTION_KEY_NAME = 'sola-polymarket-creds-key'
const CLOB_BASE_URL = 'https://clob.polymarket.com'

export type PolymarketCreds = {
  apiKey: string
  secret: string
  passphrase: string
}

let encryptionKeyPromise: Promise<CryptoKey> | null = null

async function getEncryptionKey(): Promise<CryptoKey> {
  if (encryptionKeyPromise) return encryptionKeyPromise
  encryptionKeyPromise = (async () => {
    const existing = (await idbGet(ENCRYPTION_KEY_NAME)) as CryptoKey | undefined
    if (existing && typeof existing === 'object' && 'type' in existing) return existing
    // Non-extractable AES-GCM key stored in IndexedDB. Even if the storage is
    // exfiltrated, the raw key material cannot be recovered — and because the
    // CryptoKey is only accessible from the same origin, a remote copy of the
    // encrypted credentials cannot be decrypted off-device.
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
    await idbSet(ENCRYPTION_KEY_NAME, key)
    return key
  })()
  return encryptionKeyPromise
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

function base64ToBytes(s: string): Uint8Array {
  const bin = atob(s)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

async function encryptJson(value: unknown): Promise<string> {
  const key = await getEncryptionKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const plain = new TextEncoder().encode(JSON.stringify(value))
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain))
  const blob = new Uint8Array(iv.length + cipher.length)
  blob.set(iv)
  blob.set(cipher, iv.length)
  return bytesToBase64(blob)
}

async function decryptJson<T>(blob: string): Promise<T | null> {
  try {
    const key = await getEncryptionKey()
    const bytes = base64ToBytes(blob)
    const iv = bytes.slice(0, 12)
    const cipher = bytes.slice(12)
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher)
    return JSON.parse(new TextDecoder().decode(plain)) as T
  } catch {
    return null
  }
}

export async function savePolymarketCreds(address: string, creds: PolymarketCreds): Promise<void> {
  const blob = await encryptJson(creds)
  localStorage.setItem(CREDS_KEY_PREFIX + address.toLowerCase(), blob)
}

export async function loadPolymarketCreds(address: string): Promise<PolymarketCreds | null> {
  const lower = address.toLowerCase()

  // One-time migration from v1 plaintext creds → v2 encrypted.
  const v1Key = CREDS_KEY_PREFIX_V1 + lower
  const v1 = localStorage.getItem(v1Key)
  if (v1) {
    try {
      const parsed = JSON.parse(v1) as PolymarketCreds
      if (parsed?.apiKey && parsed?.secret && parsed?.passphrase) {
        await savePolymarketCreds(address, parsed)
        localStorage.removeItem(v1Key)
        return parsed
      }
    } catch {
      // fall through — drop the bad v1 record
    }
    localStorage.removeItem(v1Key)
  }

  const blob = localStorage.getItem(CREDS_KEY_PREFIX + lower)
  if (!blob) return null
  return decryptJson<PolymarketCreds>(blob)
}

export async function clearAllPolymarketCreds(): Promise<void> {
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i)
    if (key && (key.startsWith(CREDS_KEY_PREFIX) || key.startsWith(CREDS_KEY_PREFIX_V1))) {
      localStorage.removeItem(key)
    }
  }
  try {
    const allKeys = await idbKeys()
    if (allKeys.includes(ENCRYPTION_KEY_NAME)) await idbDel(ENCRYPTION_KEY_NAME)
  } catch {
    // best-effort
  }
  encryptionKeyPromise = null
}

function base64UrlToBytes(input: string): Uint8Array {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/')
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4))
  const bin = atob(padded + pad)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

function bytesToBase64Url(bytes: ArrayBuffer): string {
  const bin = String.fromCharCode(...new Uint8Array(bytes))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_')
}

async function hmacSha256(secretB64Url: string, message: string): Promise<string> {
  const keyBytes = base64UrlToBytes(secretB64Url)
  const key = await crypto.subtle.importKey('raw', keyBytes as BufferSource, { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ])
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return bytesToBase64Url(sig)
}

export async function buildL2Headers(params: {
  creds: PolymarketCreds
  address: string
  method: 'GET' | 'POST' | 'DELETE' | 'PUT'
  path: string
  body?: string
}): Promise<Record<string, string>> {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const message = timestamp + params.method + params.path + (params.body ?? '')
  const signature = await hmacSha256(params.creds.secret, message)

  return {
    POLY_ADDRESS: params.address,
    POLY_SIGNATURE: signature,
    POLY_TIMESTAMP: timestamp,
    POLY_API_KEY: params.creds.apiKey,
    POLY_PASSPHRASE: params.creds.passphrase,
  }
}

export async function postClobCreateApiKey(params: {
  address: string
  signature: string
  timestamp: string
  nonce: string
}): Promise<PolymarketCreds> {
  const res = await fetchWithTimeout(`${CLOB_BASE_URL}/auth/api-key`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      POLY_ADDRESS: params.address,
      POLY_SIGNATURE: params.signature,
      POLY_TIMESTAMP: params.timestamp,
      POLY_NONCE: params.nonce,
    },
  })
  const data = (await res.json().catch(() => ({}))) as {
    apiKey?: string
    secret?: string
    passphrase?: string
    error?: string
    errorMsg?: string
  }
  if (!res.ok || !data.apiKey) {
    throw new Error(data.error ?? data.errorMsg ?? `Polymarket auth failed: ${res.status}`)
  }
  return { apiKey: data.apiKey, secret: data.secret!, passphrase: data.passphrase! }
}

export async function getOrCreatePolymarketCreds(params: {
  address: string
  signTypedData: (message: object) => Promise<string>
  typedDataMessage: object
  timestamp: string
  nonce: string
}): Promise<PolymarketCreds> {
  const existing = await loadPolymarketCreds(params.address)
  if (existing) return existing

  const signature = await params.signTypedData(params.typedDataMessage)
  const creds = await postClobCreateApiKey({
    address: params.address,
    signature,
    timestamp: params.timestamp,
    nonce: params.nonce,
  })
  await savePolymarketCreds(params.address, creds)
  return creds
}

export type ClobOpenOrder = {
  id: string
  market: string
  assetId: string
  side: 'BUY' | 'SELL'
  price: number
  originalSize: number
  sizeMatched: number
  remainingSize: number
  status: string
  createdAt?: string
  expiration?: string
}

type RawClobOrder = {
  id?: string
  market?: string
  asset_id?: string
  side?: string
  price?: string
  original_size?: string
  size_matched?: string
  status?: string
  created_at?: string
  expiration?: string
}

function normalizeOrder(raw: RawClobOrder): ClobOpenOrder {
  const originalSize = Number(raw.original_size ?? 0)
  const sizeMatched = Number(raw.size_matched ?? 0)
  return {
    id: String(raw.id ?? ''),
    market: String(raw.market ?? ''),
    assetId: String(raw.asset_id ?? ''),
    side: raw.side === 'SELL' ? 'SELL' : 'BUY',
    price: Number(raw.price ?? 0),
    originalSize,
    sizeMatched,
    remainingSize: Math.max(originalSize - sizeMatched, 0),
    status: String(raw.status ?? ''),
    createdAt: raw.created_at,
    expiration: raw.expiration,
  }
}

export async function fetchOpenOrders(params: {
  creds: PolymarketCreds
  address: string
  market?: string
  tokenId?: string
}): Promise<ClobOpenOrder[]> {
  const query = new URLSearchParams()
  if (params.market) query.set('market', params.market)
  if (params.tokenId) query.set('asset_id', params.tokenId)
  const path = `/data/orders${query.toString() ? `?${query.toString()}` : ''}`

  const headers = await buildL2Headers({
    creds: params.creds,
    address: params.address,
    method: 'GET',
    path,
  })
  const res = await fetchWithTimeout(`${CLOB_BASE_URL}${path}`, { headers: { accept: 'application/json', ...headers } })
  if (!res.ok) throw new Error(`Failed to fetch orders: ${res.status}`)
  const parsed = (await res.json()) as RawClobOrder[] | { data: RawClobOrder[] }
  const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed.data) ? parsed.data : []
  return list.map(normalizeOrder)
}

export async function cancelOrders(params: {
  creds: PolymarketCreds
  address: string
  orderId?: string
  orderIds?: string[]
  cancelAll?: boolean
}): Promise<{ canceled: string[]; notCanceled: Record<string, string> }> {
  let path = '/order'
  let body: string | undefined
  if (params.cancelAll) {
    path = '/cancel-all'
  } else if (params.orderIds?.length) {
    path = '/orders'
    body = JSON.stringify(params.orderIds)
  } else if (params.orderId) {
    body = JSON.stringify({ orderID: params.orderId })
  } else {
    throw new Error('Provide orderId, orderIds, or cancelAll')
  }

  const headers = {
    accept: 'application/json',
    ...(body ? { 'content-type': 'application/json' } : {}),
    ...(await buildL2Headers({
      creds: params.creds,
      address: params.address,
      method: 'DELETE',
      path,
      body,
    })),
  }
  const res = await fetchWithTimeout(`${CLOB_BASE_URL}${path}`, { method: 'DELETE', headers, body })
  const data = (await res.json().catch(() => ({}))) as {
    canceled?: string[]
    not_canceled?: Record<string, string>
    errorMsg?: string
  }
  if (!res.ok) throw new Error(data.errorMsg ?? `Cancel failed: ${res.status}`)
  return {
    canceled: data.canceled ?? (params.orderId ? [params.orderId] : []),
    notCanceled: data.not_canceled ?? {},
  }
}

export async function submitSignedOrder(params: {
  creds: PolymarketCreds
  address: string
  order: Record<string, unknown>
  signature: string
  orderType?: 'GTC' | 'FOK' | 'GTD'
}): Promise<{ success: boolean; orderId?: string; status?: string; errorMessage?: string }> {
  const sideValue = params.order.side
  const sideStr = sideValue === 0 || sideValue === 'BUY' ? 'BUY' : 'SELL'

  const body = JSON.stringify({
    order: {
      ...params.order,
      salt: Number.parseInt(String(params.order.salt), 10),
      side: sideStr,
      signature: params.signature,
    },
    owner: params.creds.apiKey,
    orderType: params.orderType ?? 'GTC',
    deferExec: false,
  })

  const headers = {
    accept: 'application/json',
    'content-type': 'application/json',
    ...(await buildL2Headers({
      creds: params.creds,
      address: params.address,
      method: 'POST',
      path: '/order',
      body,
    })),
  }

  const res = await fetchWithTimeout(`${CLOB_BASE_URL}/order`, { method: 'POST', headers, body })
  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean
    orderID?: string
    status?: string
    errorMsg?: string
    error?: string
  }
  if (!res.ok || data.success === false) {
    const msg = data.errorMsg ?? data.error ?? `CLOB error: ${res.status}`
    return { success: false, errorMessage: msg }
  }
  return { success: true, orderId: data.orderID, status: data.status }
}
