import { z } from 'zod'

import { CLOB_BASE_URL } from './constants'
import { buildL2AuthHeaders } from './l2Auth'

const polymarketOrderStructSchema = z.object({
  salt: z.string(),
  maker: z.string(),
  signer: z.string(),
  taker: z.string(),
  tokenId: z.string(),
  makerAmount: z.string(),
  takerAmount: z.string(),
  expiration: z.string(),
  nonce: z.string(),
  feeRateBps: z.string(),
  side: z.number(),
  signatureType: z.number(),
})

const credsSchema = z.object({
  apiKey: z.string(),
  secret: z.string(),
  passphrase: z.string(),
})

export const submitPolymarketOrderSchema = z.object({
  order: polymarketOrderStructSchema.describe('The unsigned order struct returned by buildPolymarketOrder'),
  signature: z.string().describe('EIP-712 signature of the typed data, produced by the client wallet'),
  orderType: z
    .enum(['GTC', 'FOK', 'GTD'])
    .optional()
    .describe('Order time-in-force: GTC (good-til-cancel, default), FOK (fill-or-kill), GTD (good-til-date)'),
  owner: z.string().describe('Maker wallet address (checksum). Must match order.maker.'),
  creds: credsSchema.describe('Polymarket CLOB API credentials {apiKey, secret, passphrase} for the maker wallet'),
})

export type SubmitPolymarketOrderInput = z.infer<typeof submitPolymarketOrderSchema>

export type SubmitPolymarketOrderOutput = {
  success: boolean
  orderId?: string
  status?: string
  transactionsHashes?: string[]
  errorMessage?: string
  raw?: unknown
}

type ClobOrderResponse = {
  success?: boolean
  errorMsg?: string
  orderID?: string
  transactionsHashes?: string[]
  status?: string
}

export async function executeSubmitPolymarketOrder(
  input: SubmitPolymarketOrderInput
): Promise<SubmitPolymarketOrderOutput> {
  const body = JSON.stringify({
    order: {
      ...input.order,
      signature: input.signature,
    },
    owner: input.creds.apiKey,
    orderType: input.orderType ?? 'GTC',
  })

  const headers = {
    accept: 'application/json',
    'content-type': 'application/json',
    ...buildL2AuthHeaders({
      creds: input.creds,
      address: input.owner,
      method: 'POST',
      path: '/order',
      body,
    }),
  }

  const res = await fetch(`${CLOB_BASE_URL}/order`, {
    method: 'POST',
    headers,
    body,
  })

  const data = (await res.json().catch(() => ({}))) as ClobOrderResponse

  if (!res.ok || data.success === false) {
    return {
      success: false,
      errorMessage: data.errorMsg ?? `Polymarket CLOB error: ${res.status} ${res.statusText}`,
      raw: data,
    }
  }

  return {
    success: true,
    orderId: data.orderID,
    status: data.status,
    transactionsHashes: data.transactionsHashes,
    raw: data,
  }
}

export const submitPolymarketOrderTool = {
  description: `Submit a signed Polymarket order to the CLOB orderbook.

Full trade flow:
1. approvePolymarketUsdc (once) — client signs approval tx
2. buildPolymarketApiKeyRequest → client signs → createPolymarketApiKey (once; persist creds locally)
3. buildPolymarketOrder → client signs typed data → submitPolymarketOrder

This tool authenticates to the CLOB with HMAC (L2 auth) using the maker's API key/secret/passphrase.

UI CARD DISPLAYS: order id, status, and any on-chain settlement hashes.`,
  inputSchema: submitPolymarketOrderSchema,
  execute: executeSubmitPolymarketOrder,
}
