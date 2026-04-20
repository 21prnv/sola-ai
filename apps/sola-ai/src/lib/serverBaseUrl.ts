export function getSolaServerBaseUrl(): string {
  const raw = import.meta.env.VITE_AGENTIC_SERVER_BASE_URL || import.meta.env.VITE_API_URL || ''
  return String(raw).replace(/\/$/, '')
}
