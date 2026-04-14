import { getAddress } from 'viem'
import { z } from 'zod'

import { getAddressForChain } from '../../utils/walletContextSimple'
import type { WalletContext } from '../../utils/walletContextSimple'

import { POLYGON_CAIP_CHAIN_ID, POLYGON_CHAIN_ID_NUMERIC } from './constants'

export const CLOB_AUTH_MESSAGE = 'This message attests that I control the given wallet'

export const CLOB_AUTH_DOMAIN = {
  name: 'ClobAuthDomain',
  version: '1',
  chainId: POLYGON_CHAIN_ID_NUMERIC,
} as const

export const CLOB_AUTH_TYPES = {
  ClobAuth: [
    { name: 'address', type: 'address' },
    { name: 'timestamp', type: 'string' },
    { name: 'nonce', type: 'uint256' },
    { name: 'message', type: 'string' },
  ],
} as const

export const buildPolymarketApiKeyRequestSchema = z.object({
  nonce: z.number().int().min(0).optional().describe('Nonce for the auth message (default: 0)'),
})

export type BuildPolymarketApiKeyRequestInput = z.infer<typeof buildPolymarketApiKeyRequestSchema>

export type ClobAuthTypedData = {
  domain: typeof CLOB_AUTH_DOMAIN
  types: typeof CLOB_AUTH_TYPES
  primaryType: 'ClobAuth'
  message: {
    address: string
    timestamp: string
    nonce: string
    message: string
  }
}

export type BuildPolymarketApiKeyRequestOutput = {
  address: string
  timestamp: string
  nonce: string
  typedData: ClobAuthTypedData
}

export async function executeBuildPolymarketApiKeyRequest(
  input: BuildPolymarketApiKeyRequestInput,
  walletContext?: WalletContext
): Promise<BuildPolymarketApiKeyRequestOutput> {
  const address = getAddress(getAddressForChain(walletContext, POLYGON_CAIP_CHAIN_ID))
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const nonce = String(input.nonce ?? 0)

  const typedData: ClobAuthTypedData = {
    domain: CLOB_AUTH_DOMAIN,
    types: CLOB_AUTH_TYPES,
    primaryType: 'ClobAuth',
    message: {
      address,
      timestamp,
      nonce,
      message: CLOB_AUTH_MESSAGE,
    },
  }

  return {
    address,
    timestamp,
    nonce,
    typedData,
  }
}

export const buildPolymarketApiKeyRequestTool = {
  description: `Build EIP-712 typed data that the user signs to register or derive a Polymarket CLOB API key.

Step 1 of a two-step flow:
1. buildPolymarketApiKeyRequest → returns typed data
2. Client wallet signs it with eth_signTypedData_v4
3. createPolymarketApiKey → exchanges the signature for {apiKey, secret, passphrase}

The resulting API key must be stored client-side (IndexedDB) and reused for every subsequent order submission.`,
  inputSchema: buildPolymarketApiKeyRequestSchema,
  execute: executeBuildPolymarketApiKeyRequest,
}
