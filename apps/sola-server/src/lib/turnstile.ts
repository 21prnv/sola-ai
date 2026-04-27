const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY?.trim()

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

if (!TURNSTILE_SECRET) {
  console.warn('[turnstile] TURNSTILE_SECRET_KEY is not set — bot protection on /api/chat will be skipped.')
}

type SiteVerifyResponse = {
  success: boolean
  'error-codes'?: string[]
}

export type TurnstileResult = { ok: true } | { ok: false; reason: string }

export const turnstileEnabled = Boolean(TURNSTILE_SECRET)

export async function verifyTurnstileToken(
  token: string | undefined,
  ip: string | undefined
): Promise<TurnstileResult> {
  if (!TURNSTILE_SECRET) return { ok: true }
  if (!token) return { ok: false, reason: 'missing-token' }

  const params = new URLSearchParams()
  params.set('secret', TURNSTILE_SECRET)
  params.set('response', token)
  if (ip) params.set('remoteip', ip)

  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })
    if (!res.ok) return { ok: false, reason: `siteverify-status-${res.status}` }
    const data = (await res.json()) as SiteVerifyResponse
    if (data.success) return { ok: true }
    return { ok: false, reason: data['error-codes']?.join(',') ?? 'siteverify-failed' }
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : 'siteverify-error' }
  }
}
