import { createHmac } from 'node:crypto'

export type PolymarketApiCreds = {
  apiKey: string
  secret: string
  passphrase: string
}

export type L2AuthHeaders = {
  POLY_ADDRESS: string
  POLY_SIGNATURE: string
  POLY_TIMESTAMP: string
  POLY_API_KEY: string
  POLY_PASSPHRASE: string
}

export function buildL2AuthHeaders(params: {
  creds: PolymarketApiCreds
  address: string
  method: 'GET' | 'POST' | 'DELETE' | 'PUT'
  path: string
  body?: string
  timestamp?: string
}): L2AuthHeaders {
  const timestamp = params.timestamp ?? Math.floor(Date.now() / 1000).toString()
  const message = timestamp + params.method + params.path + (params.body ?? '')
  const rawKey = Buffer.from(params.creds.secret, 'base64')
  const signature = createHmac('sha256', rawKey)
    .update(message)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

  return {
    POLY_ADDRESS: params.address,
    POLY_SIGNATURE: signature,
    POLY_TIMESTAMP: timestamp,
    POLY_API_KEY: params.creds.apiKey,
    POLY_PASSPHRASE: params.creds.passphrase,
  }
}
