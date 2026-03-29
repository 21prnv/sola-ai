/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DYNAMIC_ENVIRONMENT_ID: string
  /** Preferred; same as agentic-chat. Falls back to VITE_API_URL. */
  readonly VITE_AGENTIC_SERVER_BASE_URL?: string
  /** Sola-AI legacy name; used if VITE_AGENTIC_SERVER_BASE_URL is unset. */
  readonly VITE_API_URL?: string
  readonly VITE_ETHEREUM_NODE_URL: string
  readonly VITE_ARBITRUM_NODE_URL: string
  readonly VITE_POLYGON_NODE_URL: string
  readonly VITE_OPTIMISM_NODE_URL: string
  readonly VITE_BASE_NODE_URL: string
  readonly VITE_AVALANCHE_NODE_URL: string
  readonly VITE_BNBSMARTCHAIN_NODE_URL: string
  readonly VITE_GNOSIS_NODE_URL: string
  readonly VITE_SOLANA_RPC_URL: string
  readonly VITE_ENABLE_ANALYTICS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
