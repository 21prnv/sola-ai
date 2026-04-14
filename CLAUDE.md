# Sola-AI

Multi-chain AI wallet. Users chat with an LLM that invokes "tools" to query state or build transactions; a matching UI card renders each tool result and handles signing.

## Stack

- **Monorepo** (Bun workspaces). Key packages:
  - `apps/sola-server` — Bun + Hono. Hosts the AI chat route, exposes tools. `src/index.ts` re-exports every tool type for the client.
  - `apps/sola-ai` — React 19 + Vite 7 + Tailwind 4, Dynamic Labs for multi-chain wallet connect, Wagmi/viem for EVM, `@solana/web3.js` for Solana, TanStack Query, Zustand + IndexedDB for chat persistence.
  - `packages/caip`, `packages/types`, `packages/utils` — shared.
- **AI SDK**: Vercel `ai` v5 with `streamText` + tools, models via `@ai-sdk/anthropic` / `@ai-sdk/openai`.
- **Swaps**: Rango SDK (cross-chain).
- **Price/market data**: CoinGecko Pro.
- **Blockchain reads**: ShapeShift Unchained.

## Dev

```bash
cd apps/sola-server && bun run dev    # chat server
cd apps/sola-ai    && bun run dev     # client (Vite)
bun run type-check                    # per-app; both must pass
```

## The tool + card pattern (how every feature works)

**Server tool** (`apps/sola-server/src/tools/<name>.ts`):

```ts
export const mySchema = z.object({ ... })
export async function executeMy(input, walletContext?): Promise<MyOutput> { ... }
export const myTool = { description, inputSchema: mySchema, execute: executeMy }
```

- `walletContext` is passed by the chat route — it holds connected addresses per CAIP chain id, Safe deployment state, contacts. It is **read-only info**; the server never has private keys.
- Tools that need the user's address take `walletContext`; stateless ones don't.
- Tools that build transactions return a `TransactionData` struct (`chainId`, `to`, `data`, `value`, `from`) for the client to sign.
- Tools that need client-side signing (EIP-712) return **typed data** — the client signs and submits.

**Registration** (`apps/sola-server/src/routes/chat.ts`):
- Add to `buildTools()` — first arg of `wrapTools` for stateless tools, second call (with `walletContext`) for tools needing the user's address.
- Add a row to the `<tool-routing>` markdown table so the LLM knows when to pick it.

**Re-export** (`apps/sola-server/src/index.ts`): export the tool, execute fn, schema, and input/output types. The client imports types from `@sola-ai/server`.

**Client types** (`apps/sola-ai/src/types/toolOutput.ts`):
- Add an entry to `ToolOutputMap` mapping tool name → output type.
- Add an entry to `ToolMetaMap` in `apps/sola-ai/src/lib/executionState.ts` (use `Record<string, never>` if no per-tool meta is needed).

**UI card** (`apps/sola-ai/src/components/tools/<Name>UI.tsx`):
- `ToolUIComponentProps<'myTool'>` gives typed `toolPart.output`.
- Use `useToolStateRender(state, { loading, error })` for pending/error states.
- For tools that build on-chain txs, mirror `VaultDepositUI.tsx`: `useToolExecution` + `useExecuteOnce` + `switchNetworkStepByChainIdNumber` + `sendTransaction` inside `withWalletLock`.
- For EIP-712 signing: **switch network first**, then `signTypedDataWithWallet(evmWallet, typedData)` (see gotcha below).

**Card registration** (`apps/sola-ai/src/components/toolUIRegistry.tsx`): add a `{ component, displayName }` entry. Set `component: null` for tools that don't need a UI card.

## Existing features (high level)

Wallet basics: portfolio, send, receive, swap (Rango), transaction history, contacts, gas tracker, token approvals, multi-chain switching.
Market data: asset prices, historical prices, trending tokens, top gainers/losers, new coins, trending pools, categories.
Safe vault: deposit, withdraw, withdraw-all, balance.
**Polymarket trading**: see next section.

## Polymarket integration

End-to-end prediction-market trading on Polygon. Uses two Polymarket APIs:
- **Gamma** (`gamma-api.polymarket.com`) — market discovery, public
- **CLOB** (`clob.polymarket.com`) — orderbook reads (public) + order placement/cancel/list (requires **L2 auth**: HMAC-SHA256 over `timestamp + method + path + body` using a per-wallet API key/secret/passphrase)

Public positions/P&L come from the separate `data-api.polymarket.com`.

### Tool files
All under `apps/sola-server/src/tools/polymarket/`:
- `constants.ts` — contract addresses (USDC.e, CTF Exchange, Neg-Risk Exchange), EIP-712 domains + Order types, `SignatureType` enum
- `l2Auth.ts` — server-side HMAC header builder (uses `'base64'` + manual `+→-`, `/→_` replacement, **keeps `=` padding**)
- `searchPolymarketMarkets.ts` — Gamma search
- `getPolymarketPrice.ts` — CLOB orderbook (public)
- `approvePolymarketUsdc.ts` — builds unsigned USDC approval tx → CTF Exchange
- `buildPolymarketApiKeyRequest.ts` — builds EIP-712 ClobAuth typed data for L1 auth
- `createPolymarketApiKey.ts` — exchanges signed auth → `{apiKey, secret, passphrase}`
- `buildPolymarketOrder.ts` — builds EIP-712 Order typed data; supports **EOA + Safe** via `useSafe` param (signatureType=POLY_GNOSIS_SAFE, maker=Safe, signer=EOA)
- `submitPolymarketOrder.ts` — HMAC L2 auth + `POST /order` (kept mostly for LLM-direct use; normal flow submits from client)
- `cancelPolymarketOrder.ts` — returns prepared cancel; client does the actual DELETE
- `getPolymarketOrders.ts` — returns prepared query; client fetches with L2 auth
- `getPolymarketPositions.ts` — fully server-side (public data-api)

### Client files
- `lib/polymarketAuth.ts` — WebCrypto HMAC-SHA256, credential persistence to `localStorage` (keyed by lower-cased address), `fetchOpenOrders`, `cancelOrders`, `submitSignedOrder`. **Keeps `=` padding** on signature to match Polymarket's reference.
- `hooks/usePolymarketQueries.ts` — TanStack Query hooks with 15s `refetchInterval` for positions and open orders.
- `components/tools/` — 8 tool UI cards (SearchPolymarketMarketsUI, GetPolymarketPriceUI, ApprovePolymarketUsdcUI, BuildPolymarketApiKeyRequestUI, BuildPolymarketOrderUI, CancelPolymarketOrderUI, GetPolymarketOrdersUI, GetPolymarketPositionsUI).
- `components/Polymarket/` — Sidepanel: `PolymarketButton.tsx` (header trigger), `PolymarketDrawer.tsx` (right Sheet with Positions/Orders tabs), `PolymarketPositionsList.tsx`, `PolymarketOrdersList.tsx` (inline cancel + cancel-all). Mounted in `app/dashboard/page.tsx` next to `ConnectWallet`.

### Polymarket flow (what the AI / UI does end-to-end)

1. Search market → get `tokenId` for the outcome you want
2. (Once) Approve USDC: user signs approval tx on Polygon
3. (Once) Register CLOB API key: user signs EIP-712 ClobAuth → creds saved in `localStorage`
4. Build order → user signs EIP-712 Order → client HMAC-signs + POSTs to `/order`
5. Monitor via sidepanel (15s polling) or chat (`getPolymarketOrders`, `getPolymarketPositions`)
6. Cancel from sidepanel row / cancel-all button / chat (`cancelPolymarketOrder`)

## Gotchas that cost time in prior sessions

- **Polymarket requires USDC.e (bridged)**, contract `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`. Native Polygon USDC does NOT work.
- **Wallet must be on Polygon before `signTypedData`** — viem validates `domain.chainId` against the wallet's active chain and throws "Provided chainId does not match the currently active chain" otherwise. Fix: call `evmWallet.connector.switchNetwork({ networkChainId: 137 })` before signing. Applied in `BuildPolymarketApiKeyRequestUI` and `BuildPolymarketOrderUI`.
- **HMAC signature padding matters**. Polymarket's reference client uses standard base64 encoding then manually replaces `+/` → `-_` and **keeps `=` padding**. Node's `digest('base64url')` and stripping `=` manually both fail with 401. Already fixed in `l2Auth.ts` (server) and `polymarketAuth.ts` (client). If 401s return, this is the first thing to check.
- **LLM cannot pass user creds as tool args.** Tools requiring CLOB auth (cancel, list orders) return *prepared* request params from the server; the client card/panel loads creds from `localStorage` and actually talks to CLOB. Do not design future auth-requiring tools to take creds in their schema.
- **Polymarket CLOB creds live in `localStorage`** (key: `polymarket_creds_v1:<lowercase address>`). If the user switches browsers or clears storage, they must re-register (re-sign ClobAuth). No server-side persistence.
- **Safe-routed trading** works for order construction (`useSafe: true`) but the USDC approval tool is still EOA-only; approving from a Safe requires a Safe transaction (not yet built).
- **Do not commit without asking.** User has not expressed a preference to auto-commit; follow default.
