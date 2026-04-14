import { z } from 'zod'

import { CLOB_BASE_URL } from './constants'

export const createPolymarketApiKeySchema = z.object({
  address: z.string().describe('Maker address (the wallet that signed the auth typed data)'),
  signature: z.string().describe('EIP-712 signature of the ClobAuth typed data'),
  timestamp: z.string().describe('Unix seconds string included in the signed auth message'),
  nonce: z.string().optional().describe('Nonce included in the signed auth message (default: "0")'),
  derive: z
    .boolean()
    .optional()
    .describe('If true, derive existing key (GET /auth/derive-api-key). Otherwise create (POST /auth/api-key).'),
})

export type CreatePolymarketApiKeyInput = z.infer<typeof createPolymarketApiKeySchema>

export type CreatePolymarketApiKeyOutput = {
  success: boolean
  apiKey?: string
  secret?: string
  passphrase?: string
  errorMessage?: string
}

type ClobAuthResponse = {
  apiKey?: string
  secret?: string
  passphrase?: string
  error?: string
  errorMsg?: string
}

export async function executeCreatePolymarketApiKey(
  input: CreatePolymarketApiKeyInput
): Promise<CreatePolymarketApiKeyOutput> {
  const nonce = input.nonce ?? '0'
  const headers: Record<string, string> = {
    accept: 'application/json',
    POLY_ADDRESS: input.address,
    POLY_SIGNATURE: input.signature,
    POLY_TIMESTAMP: input.timestamp,
    POLY_NONCE: nonce,
  }

  const path = input.derive ? '/auth/derive-api-key' : '/auth/api-key'
  const res = await fetch(`${CLOB_BASE_URL}${path}`, {
    method: input.derive ? 'GET' : 'POST',
    headers,
  })
  const data = (await res.json().catch(() => ({}))) as ClobAuthResponse

  if (!res.ok || !data.apiKey) {
    return {
      success: false,
      errorMessage: data.error ?? data.errorMsg ?? `Polymarket auth error: ${res.status} ${res.statusText}`,
    }
  }

  return {
    success: true,
    apiKey: data.apiKey,
    secret: data.secret,
    passphrase: data.passphrase,
  }
}

export const createPolymarketApiKeyTool = {
  description: `Register (or derive) a Polymarket CLOB API key using a signed auth typed-data payload.

Step 2 of the API key flow. Returns {apiKey, secret, passphrase} — the client MUST persist these (IndexedDB) because they are required to sign every subsequent order submission.

Use derive=true if the user has previously registered and just needs their existing credentials back.

UI CARD DISPLAYS: shortened api key + save-to-local confirmation. Never echo the secret in plain text.`,
  inputSchema: createPolymarketApiKeySchema,
  execute: executeCreatePolymarketApiKey,
}
