# Sola-AI

Monorepo aligned with **agentic-chat**: Dynamic + Wagmi (EVM) + Solana, AI SDK streaming chat, tool UI cards, swap/send execution, portfolio drawer, and Zustand + IndexedDB conversation persistence.

## Stack

- **Frontend** (`apps/sola-ai`): React 19, Vite 7, Tailwind 4, React Router, TanStack Query, AI SDK v5 (`DefaultChatTransport`), Dynamic Labs, Wagmi/viem
- **Backend** (`apps/sola-server`): Bun, Hono, `streamText` + tools (same pattern as agentic-chat)
- **Packages**: `@sola-ai/caip`, `@sola-ai/types`, `@sola-ai/utils` (replacing `@shapeshiftoss/*` in the ported UI)

## Quick start

1. Copy env from the repo root (Vite loads `Sola-AI/.env` via `envDir` in `vite.config.mts`).
2. Set at minimum:
   - `VITE_DYNAMIC_ENVIRONMENT_ID` — [Dynamic](https://www.dynamic.xyz/) project ID
   - `VITE_AGENTIC_SERVER_BASE_URL` or `VITE_API_URL` — API base, e.g. `http://localhost:8787`
   - `RANGO_API_KEY` — [Rango Basic API key](https://docs.rango.exchange/api-integration/basic-api-single-step/tutorial/sdk-example) for `initiateSwap` / cross-chain quotes
   - Per-chain RPC URLs (`VITE_ETHEREUM_NODE_URL`, `VITE_SOLANA_RPC_URL`, …) as in agentic-chat’s `.env.example`
3. `bun install`
4. `bun dev`
5. Open `http://localhost:5173` (Vite dev server)

The dev server proxies `/api/*` to `http://localhost:8787` so you can also hit the backend through the same origin.

## Scripts

- `bun dev` — frontend + backend
- `bun dev:frontend` / `bun dev:backend` — one app only
- `bun build` — build frontend and server
- `bun type-check` — TypeScript across workspaces

## What was ported from agentic-chat

The **entire** `agentic-chat/apps/agentic-chat/src` tree was copied into `apps/sola-ai/src`, with:

- Imports rewritten: `@shapeshiftoss/*` → `@sola-ai/*` and `@shapeshiftoss/agentic-server` → `@sola-ai/server` (type-only)
- `ChatProvider` + portfolio client using `getSolaServerBaseUrl()` (`VITE_AGENTIC_SERVER_BASE_URL` || `VITE_API_URL` || `http://localhost:8787`)
- Zustand persist store name / export filenames branded for Sola AI
- Monorepo **override** `@solana/web3.js@1.98.4` to avoid duplicate web3.js types
- Solana signer bridging: `getSigner() as SolanaWalletSigner` where Dynamic’s types diverged

Tool names and server routes should match your `apps/sola-server` implementation (already forked from the same chat/tool model).

## Swaps (backend)

- Token swaps use **[Rango](https://rango.exchange/)** via `rango-sdk-basic` only (Relay and Bebop aggregators were removed). Supported chains follow Rango’s live **[integrations / meta API](https://docs.rango.exchange/integrations)** — the server calls `meta()` and maps your CAIP `chainId` to Rango’s `blockchain` id (EVM by numeric chain id, Solana by genesis hash, Cosmos by chain id, etc.). Optional env: `RANGO_SLIPPAGE_PERCENT` (default `1.5`), `RANGO_META_CACHE_MS` (meta cache TTL, default 1 hour). UTXO chains need a genesis-hash → Rango name entry in `apps/sola-server/src/utils/getRangoSwap/rangoBlockchainResolver.ts` if you use them.

## Backend AI models

- Default provider is **OpenAI** (`gpt-3.5-turbo` unless overridden). Set `OPENAI_API_KEY` and optionally `OPENAI_MODEL` in `.env`. Use `AI_PROVIDER=venice` for Venice (unchanged).
- Legacy `AI_PROVIDER=google` / `gemini` is mapped to OpenAI with a console warning.

## Notes

- **Sentry / Mixpanel** in `main.tsx` still use the agentic placeholders; replace DSN / tokens for production.
- Frontend **tests** are excluded from `tsc` in `apps/sola-ai/tsconfig.json`; run with `bun test` from the frontend app when wired to `bun:test`.
