export const DEFAULT_FETCH_TIMEOUT_MS = 15_000

export type FetchWithTimeoutInit = RequestInit & {
  timeoutMs?: number
}

/**
 * `fetch` with an AbortController-backed timeout. Falls back to the default
 * 15s deadline; callers can override via `timeoutMs`. If the caller already
 * passes a `signal`, it is composed with the timeout signal.
 */
export async function fetchWithTimeout(input: RequestInfo | URL, init: FetchWithTimeoutInit = {}): Promise<Response> {
  const { timeoutMs = DEFAULT_FETCH_TIMEOUT_MS, signal: callerSignal, ...rest } = init
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(new Error(`Request timed out after ${timeoutMs}ms`)), timeoutMs)

  const onCallerAbort = () => controller.abort(callerSignal?.reason)
  if (callerSignal) {
    if (callerSignal.aborted) onCallerAbort()
    else callerSignal.addEventListener('abort', onCallerAbort, { once: true })
  }

  try {
    return await fetch(input, { ...rest, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
    callerSignal?.removeEventListener('abort', onCallerAbort)
  }
}
