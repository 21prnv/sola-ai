import { createRemoteJWKSet, jwtVerify } from 'jose'

const DYNAMIC_ENV_ID = process.env.VITE_DYNAMIC_ENVIRONMENT_ID ?? process.env.DYNAMIC_ENVIRONMENT_ID

if (!DYNAMIC_ENV_ID) {
  console.warn(
    '[dynamicAuth] DYNAMIC_ENVIRONMENT_ID (or VITE_DYNAMIC_ENVIRONMENT_ID) is not set — /api/chat will reject all authenticated requests.'
  )
}

const JWKS_URL = DYNAMIC_ENV_ID
  ? new URL(`https://app.dynamic.xyz/api/v0/sdk/${DYNAMIC_ENV_ID}/.well-known/jwks`)
  : null

const jwks = JWKS_URL
  ? createRemoteJWKSet(JWKS_URL, {
      cacheMaxAge: 10 * 60_000,
      cooldownDuration: 30_000,
    })
  : null

const EXPECTED_ISSUER = DYNAMIC_ENV_ID ? `app.dynamicauth.com/${DYNAMIC_ENV_ID}` : undefined

type VerifiedCredential = {
  address?: string
  chain?: string
  format?: string
}

export type DynamicSession = {
  sub: string
  verifiedAddresses: Set<string>
}

export async function verifyDynamicJwt(token: string): Promise<DynamicSession | null> {
  if (!jwks) return null
  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: EXPECTED_ISSUER,
    })

    const subject = typeof payload.sub === 'string' ? payload.sub : undefined
    if (!subject) return null

    const credentials = Array.isArray(payload.verified_credentials)
      ? (payload.verified_credentials as VerifiedCredential[])
      : []

    const verifiedAddresses = new Set<string>()
    for (const cred of credentials) {
      if (typeof cred.address === 'string' && cred.address.trim().length > 0) {
        verifiedAddresses.add(cred.address.trim().toLowerCase())
      }
    }

    return { sub: subject, verifiedAddresses }
  } catch {
    return null
  }
}

export function extractBearerToken(authHeader: string | undefined | null): string | undefined {
  if (!authHeader) return undefined
  const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim())
  return match?.[1]?.trim() || undefined
}
