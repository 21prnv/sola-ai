export const solaAIKnowledge = {
  company: `# About Sola AI

## What this is

**Sola AI is a personal side project** — not a company, not an official product team, and not affiliated with any legacy exchange or corporate DAO narrative. It is an experiment in combining **self-custody crypto tooling** with an **AI-assisted interface** so you can swap, track, and explore assets across chains from one place.

**Built by prnv.**

## Goals

- **Self-custody first:** You keep control of keys; the app routes trades and reads chain data — it does not custody funds.
- **Multi-chain (via Rango):** Swaps route through **Rango** only; supported chains are whatever Rango exposes for this integration.
- **Practical UX:** Natural-language help for quotes, swaps, and context — useful for learning and day-to-day use.
- **Honest scope:** Features, chains, and partners depend on what is wired up in this repo and your environment; the assistant should not invent corporate history or guaranteed yields.

## What it is not

- Not investment advice; not a bank or broker.
- Not responsible for third-party protocols behind **Rango** (DEXs, bridges, etc.) — users interact under Rango and venue terms and risks.
- **No fiat on/off-ramp** in this app — users fund wallets elsewhere.
- No claim to historical funding rounds, founding dates, or treasury figures from other products — those do not apply here.

## Project & feedback

- Developed as a **side project**; timelines and support are best-effort.
- Improvements, issues, and direction live with the maintainer and whoever contributes to the repository — not a separate “company DAO” HR or governance program unless you explicitly add one.`,

  platform: `# Sola AI Platform Overview

## What is Sola AI?

Sola AI is a **side-project** multichain crypto workspace: a **non-custodial** way to trade, track positions, and explore assets with **AI help**, across the chains and integrations enabled in your build.

## Scope (this build)

- **Swaps:** **Rango only** — no other swap or bridge aggregator is integrated here.
- **Chains & assets:** Whatever **Rango** supports for quotes in your environment; confirm in the swap UI — do not invent network or token support.
- **Fiat:** **None** — no buy-with-card or sell-to-bank flows.
- **Mobile:** **No native app** — browser + wallet only.

## Core Principles

### Non-Custodial
- Users maintain complete control of their private keys
- Sola AI never holds or has access to user funds
- All trades and transactions are executed directly from user wallets
- Self-custody throughout the entire user experience

### No KYC (for Sola AI itself)
- Swapping is wallet-to-wallet via **Rango**; this project does not run fiat ramps, so there is **no in-app KYC flow** from Sola AI
- Privacy-preserving by design for what the web app collects (see your deployment’s privacy policy if any)

### Open source (when applicable)
- If the repo is public, others can review and contribute; treat transparency as a goal, not a corporate guarantee

### Multi-chain (via Rango)
- Supported networks and assets are determined by **Rango** and your API/configuration — use the swap UI as source of truth

### Web-only
- **No native mobile app** — use a browser with a wallet (extension, WalletConnect, etc. as wired in the front end)

## Platform Access

### Supported Wallets
Typical setups include:
- Browser extension wallets (e.g. MetaMask)
- WalletConnect-compatible wallets when the web app enables it
- Hardware wallets when the connected wallet supports them

### No Account Required
- Connect wallet directly to start using
- No signup or registration process
- Instant access to all platform features

## User Experience

### Swaps (Rango)
- Request quotes and execute swaps through **Rango** (same-chain or cross-chain as offered)
- Slippage and route details come from Rango’s response — present what the UI shows

### Portfolio & history (if implemented)
- Any balance or history views depend on the front end; do not promise a specific number of chains or DeFi protocol integrations beyond what users see`,

  swappers: `# Swaps — Rango only

**Sola AI integrates a single swap stack: [Rango](https://rango.exchange).** All swap and bridge-style routes exposed in this project come from **Rango’s API** (Rango aggregates underlying DEXs, bridges, and liquidity sources — you do not separately integrate those brands in this app).

## What is included

- **Quotes and routing:** Request best routes from Rango for the user’s from/to assets and chains.
- **Same-chain and cross-chain:** Whatever Rango returns for the pair (may be multiple steps or chains).
- **Execution:** User signs transactions with their wallet per Rango’s instructions.

## What is *not* included

- **No other first-party swap integrations** (no parallel 0x, Jupiter, CoW, THORChain app integration, etc. in this codebase’s swap path).
- **No fiat on-ramp or off-ramp** — Rango is for crypto-to-crypto routes only here.

## Guidance for the assistant

- Do **not** tell users to use built-in fiat ramps — there are none.
- Do **not** name other aggregators as if Sola AI calls them directly; **Rango** is the integration surface.
- If a chain or token fails to quote, say it may be unsupported by Rango for this request — don’t invent support.`,

  chains: `# Chains & networks

Sola AI does **not** maintain an independent “official list” of chains for swapping. **Whatever Rango can quote** for a from/to pair (plus what the user’s wallet can sign) defines what works.

## How to answer users

- Point them to the **swap UI** or a failed quote message — that is the real source of truth.
- **EVM networks** (Ethereum, L2s like Arbitrum/Base/Optimism, Polygon, BSC, etc.) often appear when Rango routes through them.
- **Non-EVM** routes (e.g. Solana, Bitcoin-related flows) only apply **if Rango returns a route** — do not guarantee them.

## Same-chain vs cross-chain

- **Same-chain:** e.g. USDC → ETH on one network.
- **Cross-chain:** e.g. asset on chain A → asset on chain B via Rango’s composed route (may involve multiple transactions or intermediaries).

## Fiat

- **No on-ramp / off-ramp** in this app — users must already hold crypto or acquire it outside Sola AI.`,

  staking: `# Staking & yield

**This Sola AI project is scoped around Rango swaps only** — there is **no dedicated staking or yield product** described here (no THORChain savers UI, no Cosmos staking UI, no LP dashboards as part of this knowledge base).

If users ask about staking, yield farming, or revenue share: explain generically how those work onchain elsewhere, and clarify that **this app’s integrated flow is swapping via Rango**, not a staking suite — unless you later add it to the UI and update this file.`,

  features: `# Sola AI features (this build)

## Swaps — Rango only
- Quotes and executable routes from **Rango** (underlying venues are Rango’s concern, not separate integrations in this app)
- **Same-chain and cross-chain** only when Rango returns a valid route
- User approves transactions in their wallet; **non-custodial**

## No fiat on-ramp or off-ramp
- **No** buy-crypto-with-card, bank transfer, or sell-to-fiat inside Sola AI
- Users must fund wallets **outside** this app

## No native mobile app
- **Web-only** (browser + wallet). Do not mention App Store, Play Store, or a dedicated Sola AI mobile binary

## No limit orders (in this knowledge scope)
- **No** CoW / limit-order product described here — swapping is **spot-style via Rango** as implemented in the UI

## Staking / yield
- **Not** part of this project’s documented surface — see the **staking** knowledge category

## Portfolio, chat, history
- Whatever the web app shows (balances, history, AI chat) is implementation-specific; don’t promise features the UI doesn’t have

## Security
- **Self-custody:** keys stay in the user’s wallet
- **No in-app KYC** — there are no fiat ramps to trigger one

## Assistant rules
- Do **not** invent extra swap providers, ramps, or mobile apps
- Point swap questions at **Rango** and the in-app quote flow`,

  'mobile-app': `# Mobile

**There is no native Sola AI mobile app** (no iOS or Android app to download).

## What users should do

- Open the **web app** in a **browser** on desktop or phone
- Use a **browser extension wallet** or connect via **WalletConnect** to a wallet on their phone if your front end supports it — that is still **web**, not a Sola AI app store product

## Do not suggest

- App Store / Play Store / TestFlight downloads for “Sola AI”
- Push notifications from a Sola AI native client
- Fiat on-ramps (there are none in this project)

Support is **best-effort** for a side project — use whatever channels you list in the repo (issues, etc.).`,
} as const

export type KnowledgeCategory = keyof typeof solaAIKnowledge
