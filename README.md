# Sola-AI

AI for your wallets. Chat your way across chains — portfolios, swaps, sends, prediction markets, and vaults, all from one conversation.

Built by [prnv](https://x.com/21prnv).

---

## Features

### Wallet basics
- **Multi-chain portfolio** across EVM chains + Solana (balances, USD value, PnL)
- **Send** tokens (ENS resolution, contact book)
- **Receive** (QR + address)
- **Cross-chain swaps** via Rango SDK — supports **natural-language slippage** ("swap 0.1 ETH to USDC with 0.3% slippage"); falls back to `RANGO_SLIPPAGE_PERCENT` env default (1.5%) when unspecified
- **Transaction history** per chain
- **Contacts**: save / list addresses with aliases
- **Gas tracker** across chains
- **Token approvals**: view and revoke ERC-20 approvals
- **Network switching** from chat

### Market data
- Asset prices (CoinGecko Pro)
- Historical prices with chart cards
- Trending tokens, top gainers/losers, new coins
- Trending pools and token categories

### Safe vault
- Deposit, withdraw, withdraw-all, balance check

### Polymarket (prediction markets on Polygon)
- Search markets (Gamma API)
- Get orderbook price
- Approve USDC.e for CTF Exchange
- Register CLOB API key (EIP-712 ClobAuth)
- Build + submit orders (EOA and Safe-routed)
- List open orders, cancel individual / cancel-all
- View positions + realized P&L
- Sidepanel with live 15s polling of positions and orders

### Chat / UX
- AI SDK v5 streaming with tool cards (Vercel `ai`)
- Typed tool output registry — every tool has a matching React card
- Zustand + IndexedDB conversation persistence
- Dynamic Labs multi-chain wallet connect (EVM + Solana)
- Sentry error tracking + source-map uploads on `main`

---

## Stack

- **Monorepo**: Bun workspaces + Turbo-style filters
- **Frontend** (`apps/sola-ai`): React 19, Vite 7, Tailwind 4, React Router, TanStack Query, Zustand, Wagmi/viem, `@solana/web3.js`
- **Backend** (`apps/sola-server`): Bun + Hono, `streamText` + tools
- **AI models**: `@ai-sdk/anthropic`, `@ai-sdk/openai` (default), Venice optional
- **Swaps**: Rango SDK (cross-chain)
- **Market data**: CoinGecko Pro
- **Blockchain reads**: per-chain HTTP node APIs
- **Prediction markets**: Polymarket Gamma + CLOB APIs
- **Shared packages**: `@sola-ai/caip`, `@sola-ai/types`, `@sola-ai/utils`

---

## Quick start

```bash
# 1. Install Bun >= 1.3.2
curl -fsSL https://bun.sh/install | bash

# 2. Clone and install
git clone <this-repo>
cd Sola-AI
bun install

# 3. Copy env template and fill in keys
cp .env.example .env

# 4. Run frontend + backend together
bun dev
```

Open [http://localhost:5173](http://localhost:5173). The Vite dev server proxies `/api/*` to `http://localhost:8787` (the Bun server).

Vite is configured with `envDir` at the repo root, so a single `.env` file works for both apps.

---

## Environment variables

See [`.env.example`](./.env.example) for the full list. Minimum required to boot:

| Variable | Purpose |
| --- | --- |
| `VITE_DYNAMIC_ENVIRONMENT_ID` | [Dynamic](https://www.dynamic.xyz/) project ID (wallet connect) |
| `OPENAI_API_KEY` | LLM provider — default is OpenAI |
| `COINGECKO_API_KEY` | Price + market data (CoinGecko Pro) |
| `RANGO_API_KEY` | [Rango Basic](https://docs.rango.exchange/api-integration/basic-api-single-step) API key for swaps |
| `VITE_*_NODE_URL` | Per-chain RPC endpoints |
| `*_HTTP_URL` | Per-chain HTTP API endpoints |

Optional providers: `VENICE_API_KEY` (set `AI_PROVIDER=venice`), `ANTHROPIC_API_KEY`, Sentry DSN, Mixpanel token.

---

## Scripts

| Command | What it does |
| --- | --- |
| `bun dev` | Frontend + backend concurrently |
| `bun dev:frontend` | Vite dev server only |
| `bun dev:backend` | Bun/Hono server only |
| `bun build` | Build both apps |
| `bun type-check` | TypeScript across workspaces |
| `bun test` | Server + frontend tests |
| `bun lint` | ESLint over the repo |
| `bun lint:fix` | ESLint with auto-fix |

---

## Project structure

```
Sola-AI/
├── apps/
│   ├── sola-ai/          # React + Vite frontend
│   │   └── src/
│   │       ├── components/tools/   # One UI card per backend tool
│   │       ├── components/Polymarket/
│   │       ├── hooks/
│   │       ├── lib/
│   │       └── providers/
│   └── sola-server/      # Bun + Hono backend
│       └── src/
│           ├── routes/chat.ts      # streamText + tool registry
│           ├── tools/              # One file per tool
│           │   ├── polymarket/
│           │   └── vault/
│           └── lib/
├── packages/
│   ├── caip/             # CAIP-2 / CAIP-19 helpers
│   ├── types/            # Shared types (EvmSolanaNetwork, etc.)
│   └── utils/
└── .github/workflows/ci.yml    # Lint, type-check, test, Sentry release, Railway deploy
```

---

## The tool + card pattern

Every feature is built the same way. Adding a new one takes four files:

1. **Server tool** (`apps/sola-server/src/tools/<name>.ts`) — Zod input schema + `execute` function. If it needs the user's address, take a `walletContext` arg. Transaction-building tools return a `TransactionData` struct for the client to sign.
2. **Register** in `apps/sola-server/src/routes/chat.ts` — add to `buildTools()` and add a row to the `<tool-routing>` markdown table so the LLM knows when to pick it.
3. **Re-export** types from `apps/sola-server/src/index.ts`.
4. **UI card** in `apps/sola-ai/src/components/tools/<Name>UI.tsx` + register in `toolUIRegistry.tsx`.

See `CLAUDE.md` for the full pattern including Polymarket-specific gotchas.

---

## Deployment

Deployed on **Railway** as two services:

- `frontend` — Vite SPA
- `server` — Bun/Hono backend

CI/CD via `.github/workflows/ci.yml`:

1. On every push / PR → build, type-check, lint, test
2. On push to `main` → Sentry release + source-map upload
3. On push to `main` (after CI passes) → `railway up` for both services

Railway's auto-deploy is turned off for both services; the GitHub Action is the single deploy path. Requires `RAILWAY_TOKEN` (project token) and `SENTRY_AUTH_TOKEN` in repo secrets.

---

## License

See [LICENSE](./LICENSE).

---

Inspired by **ShapeShift**.
