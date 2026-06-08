// Cloudflare Turnstile client wrapper. Renders a single invisible widget and
// executes it on demand. Tokens are single-use on the server, so each caller
// consumes the current token and the next caller runs a fresh challenge.
//
// If VITE_TURNSTILE_SITE_KEY is not set, all calls are no-ops — the server is
// expected to also be unconfigured (TURNSTILE_SECRET_KEY) in dev.

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim()
const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

interface TurnstileWidgetOptions {
  sitekey: string
  size?: 'normal' | 'compact' | 'invisible' | 'flexible'
  execution?: 'render' | 'execute'
  appearance?: 'always' | 'execute' | 'interaction-only'
  callback?: (token: string) => void
  'error-callback'?: (errorCode?: string) => void
  'expired-callback'?: () => void
  'timeout-callback'?: () => void
  'unsupported-callback'?: () => void
}

interface TurnstileApi {
  render: (el: HTMLElement | string, options: TurnstileWidgetOptions) => string
  reset: (widgetId?: string) => void
  remove: (widgetId?: string) => void
  execute: (widgetId?: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

let scriptPromise: Promise<void> | null = null
let widgetId: string | null = null
let pendingTokenResolve: ((token: string | undefined) => void) | null = null
let timeoutId: ReturnType<typeof setTimeout> | null = null
let tokenRequestQueue: Promise<unknown> = Promise.resolve()

const TOKEN_TIMEOUT_MS = 10_000

export function isTurnstileConfigured(): boolean {
  return Boolean(SITE_KEY)
}

function loadScript(): Promise<void> {
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    if (window.turnstile) {
      resolve()
      return
    }
    const existing = document.querySelector<HTMLScriptElement>(`script[src^="${SCRIPT_URL}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Turnstile script failed')), { once: true })
      return
    }
    const s = document.createElement('script')
    s.src = SCRIPT_URL
    s.async = true
    s.defer = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Turnstile script failed'))
    document.head.appendChild(s)
  })
  return scriptPromise
}

function resolvePendingToken(token: string | undefined) {
  const resolve = pendingTokenResolve
  pendingTokenResolve = null
  if (timeoutId) {
    clearTimeout(timeoutId)
    timeoutId = null
  }
  resolve?.(token)
}

function resetWidget() {
  if (!widgetId || !window.turnstile) return
  try {
    window.turnstile.reset(widgetId)
  } catch {
    // ignore
  }
}

export async function initTurnstile(): Promise<void> {
  if (!SITE_KEY) return
  if (widgetId) return
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  try {
    await loadScript()
  } catch {
    return
  }
  if (!window.turnstile || widgetId) return
  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.bottom = '0'
  container.style.right = '0'
  container.style.width = '0'
  container.style.height = '0'
  container.style.overflow = 'hidden'
  container.style.pointerEvents = 'none'
  container.setAttribute('aria-hidden', 'true')
  document.body.appendChild(container)
  widgetId = window.turnstile.render(container, {
    sitekey: SITE_KEY,
    size: 'invisible',
    execution: 'execute',
    appearance: 'execute',
    callback: token => resolvePendingToken(token),
    'error-callback': errorCode => {
      if (errorCode) console.warn(`[turnstile] challenge error: ${errorCode}`)
      resolvePendingToken(undefined)
    },
    'expired-callback': () => {
      resolvePendingToken(undefined)
    },
    'timeout-callback': () => {
      resolvePendingToken(undefined)
    },
    'unsupported-callback': () => {
      console.warn('[turnstile] browser is unsupported')
      resolvePendingToken(undefined)
    },
  })
}

async function executeTurnstileChallenge(): Promise<string | undefined> {
  if (!SITE_KEY) return undefined
  if (!widgetId) await initTurnstile()
  if (!widgetId || !window.turnstile) return undefined

  return new Promise<string | undefined>(resolve => {
    pendingTokenResolve = resolve
    timeoutId = setTimeout(() => {
      resolvePendingToken(undefined)
    }, TOKEN_TIMEOUT_MS)

    try {
      resetWidget()
      window.turnstile?.execute(widgetId ?? undefined)
    } catch {
      resolvePendingToken(undefined)
    }
  })
}

export function getTurnstileToken(): Promise<string | undefined> {
  const request = tokenRequestQueue.then(() => executeTurnstileChallenge())
  tokenRequestQueue = request.catch(() => undefined)
  return request
}
