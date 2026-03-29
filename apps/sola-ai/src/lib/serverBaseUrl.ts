/** Backend base URL (no trailing slash). Matches agentic-chat `VITE_AGENTIC_SERVER_BASE_URL` + Sola `VITE_API_URL` fallback. */
export function getSolaServerBaseUrl(): string {
  const raw = import.meta.env.VITE_AGENTIC_SERVER_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:8787'
  return String(raw).replace(/\/$/, '')
}
