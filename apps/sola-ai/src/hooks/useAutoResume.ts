const STREAMING_KEY = 'sola-ai-active-stream'

interface StreamingState {
  conversationId: string
  timestamp: number
}

export function markStreamingActive(conversationId: string) {
  try {
    sessionStorage.setItem(
      STREAMING_KEY,
      JSON.stringify({ conversationId, timestamp: Date.now() } satisfies StreamingState)
    )
  } catch {
    // sessionStorage not available
  }
}

export function markStreamingDone() {
  try {
    sessionStorage.removeItem(STREAMING_KEY)
  } catch {
    // sessionStorage not available
  }
}

export function getActiveStream(): StreamingState | null {
  try {
    const raw = sessionStorage.getItem(STREAMING_KEY)
    if (!raw) return null
    const state = JSON.parse(raw) as StreamingState
    if (Date.now() - state.timestamp > 5 * 60 * 1000) {
      sessionStorage.removeItem(STREAMING_KEY)
      return null
    }
    return state
  } catch {
    return null
  }
}
