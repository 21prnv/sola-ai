import {
  arbitrumChainId,
  avalancheChainId,
  baseChainId,
  bscChainId,
  btcChainId,
  cosmosChainId,
  ethChainId,
  gnosisChainId,
  optimismChainId,
  polygonChainId,
  solanaChainId,
  suiChainId,
  tronChainId,
} from '@sola-ai/caip'
import { convertToModelMessages, smoothStream, stepCountIs, streamText } from 'ai'
import { format, getUnixTime } from 'date-fns'
import type { Context } from 'hono'
import { z } from 'zod'

import { createResumableStream, registerStream, clearStream } from '../lib/streamRegistry'
import { CHAIN_ID_TO_NETWORK, VAULT_EVM_CHAIN_IDS } from '../lib/vaultNetworks'
import { getModel, getProviderName } from '../models'
import { checkWalletCapabilitiesTool } from '../tools/checkWalletCapabilities'
import { lookupExternalAddressTool } from '../tools/getAccount'
import { getAllowanceTool } from '../tools/getAllowance'
import { getAssetPricesTool } from '../tools/getAssetPrices'
import { getAssetsTool } from '../tools/getAssets'
import { getCategoriesTool } from '../tools/getCategories'
import { getHistoricalPricesTool } from '../tools/getHistoricalPrices'
import { getNewCoinsTool } from '../tools/getNewCoins'
import { getSolaAIKnowledgeTool } from '../tools/getSolaAIKnowledge'
import { getTopGainersLosersTool } from '../tools/getTopGainersLosers'
import { getTrendingPoolsTool } from '../tools/getTrendingPools'
import { getTrendingTokensTool } from '../tools/getTrendingTokens'
import { initiateSwapTool, initiateSwapUsdTool } from '../tools/initiateSwap'
import { mathCalculator } from '../tools/mathCalculator'
import { portfolioTool } from '../tools/portfolio'
import { receiveTool } from '../tools/receive'
import { sendTool } from '../tools/send'
import { switchNetworkTool } from '../tools/switchNetwork'
import { transactionHistoryTool } from '../tools/transactionHistory'
import { vaultBalanceTool, vaultDepositTool, vaultWithdrawTool, vaultWithdrawAllTool } from '../tools/vault'
import { allSupportedChainIds, buildWalletContextFromChatFields } from '../utils/chatWalletContext'
import type { SafeChainDeployment, WalletContext } from '../utils/walletContextSimple'

/** CAIP chain ids for Dynamic multichain wallets (must match `collectDynamicMultichainAddresses` on the client). */
const STARKNET_SN_MAIN_CAIP = 'starknet:SN_MAIN'

const dynamicMultichainChainLabels: Record<string, string> = {
  [btcChainId]: 'Bitcoin',
  [cosmosChainId]: 'Cosmos Hub',
  [tronChainId]: 'Tron',
  [suiChainId]: 'Sui',
  [STARKNET_SN_MAIN_CAIP]: 'Starknet',
}

function wrapTool<TSchema, TExecute extends (args: never, walletContext?: WalletContext) => unknown>(
  name: string,
  tool: { description: string; inputSchema: TSchema; execute: TExecute },
  walletContext?: WalletContext
) {
  return {
    description: tool.description,
    inputSchema: tool.inputSchema,
    execute: async (args: Parameters<TExecute>[0]) => {
      console.log(`[Tool:call] ${name}`, JSON.stringify(args))
      const start = Date.now()
      try {
        const result = await tool.execute(args, walletContext)
        console.log(`[Tool:ok] ${name} (${Date.now() - start}ms)`, typeof result === 'object' ? JSON.stringify(result).slice(0, 300) : result)
        return result
      } catch (err) {
        console.error(`[Tool:error] ${name} (${Date.now() - start}ms)`, {
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
        })
        throw err
      }
    },
  }
}

function wrapTools(
  tools: Record<
    string,
    { description: string; inputSchema: unknown; execute: (args: never, walletContext?: WalletContext) => unknown }
  >,
  walletContext?: WalletContext
) {
  return Object.fromEntries(Object.entries(tools).map(([name, tool]) => [name, wrapTool(name, tool, walletContext)]))
}

function buildTools(walletContext: WalletContext) {
  return {
    ...wrapTools({
      mathCalculatorTool: mathCalculator,
      getAssetsTool,
      getAssetPricesTool,
      getHistoricalPricesTool,
      lookupExternalAddress: lookupExternalAddressTool,
      switchNetworkTool,
      getSolaAIKnowledgeTool,
      getTrendingTokensTool,
      getTopGainersLosersTool,
      getTrendingPoolsTool,
      getCategoriesTool,
      getNewCoinsTool,
    }),
    ...wrapTools(
      {
        checkWalletCapabilitiesTool,
        transactionHistoryTool,
        portfolioTool,
        initiateSwapTool,
        initiateSwapUsdTool,
        sendTool,
        receiveTool,
        vaultBalanceTool,
        vaultDepositTool,
        vaultWithdrawTool,
        vaultWithdrawAllTool,
      },
      walletContext
    ),
    getAllowanceTool: {
      description: getAllowanceTool.description,
      inputSchema: getAllowanceTool.inputSchema,
      execute: async (args: Parameters<typeof getAllowanceTool.execute>[0]) => {
        const chainId = args?.asset?.chainId
        const from = args?.from ?? (chainId ? walletContext.connectedWallets?.[chainId]?.address : undefined)
        if (!from) {
          throw new Error('Missing `from` address. Connect a wallet or specify `from`.')
        }
        return getAllowanceTool.execute({ ...args, from })
      },
    },
  }
}

const chainIdToName: Record<string, string> = {
  [ethChainId]: 'Ethereum',
  [arbitrumChainId]: 'Arbitrum',
  [optimismChainId]: 'Optimism',
  [baseChainId]: 'Base',
  [polygonChainId]: 'Polygon',
  [avalancheChainId]: 'Avalanche',
  [bscChainId]: 'BNB Chain',
  [gnosisChainId]: 'Gnosis',
  [solanaChainId]: 'Solana',
}

function buildConnectedWalletsPrompt(
  evmAddress?: string,
  solanaAddress?: string,
  approvedChainIds?: string[],
  dynamicMultichainAddresses?: Record<string, string>
): string {
  const multichainEntries = dynamicMultichainAddresses ? Object.entries(dynamicMultichainAddresses) : []
  const hasMultichain = multichainEntries.some(([, a]) => a?.trim())

  if (!evmAddress && !solanaAddress && !hasMultichain) {
    return '**Connected Wallets:** None'
  }

  const parts: string[] = []
  if (evmAddress) parts.push(`EVM (${evmAddress.slice(0, 6)}...${evmAddress.slice(-4)})`)
  if (solanaAddress) parts.push(`Solana (${solanaAddress.slice(0, 4)}...${solanaAddress.slice(-4)})`)
  for (const [chainId, addr] of multichainEntries) {
    const trimmed = addr?.trim()
    if (!trimmed) continue
    const label = dynamicMultichainChainLabels[chainId] ?? chainId
    const short = trimmed.length > 14 ? `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}` : trimmed
    parts.push(`${label} (${short})`)
  }

  let prompt = `**Connected Wallets:** ${parts.join(', ')}`

  // If we have approved chain IDs (WalletConnect), show which networks are connected
  if (approvedChainIds && approvedChainIds.length > 0) {
    const connectedNames = approvedChainIds
      .map(id => chainIdToName[id])
      .filter(Boolean)
      .sort()

    const notConnectedIds = allSupportedChainIds.filter(id => !approvedChainIds.includes(id))
    const notConnectedNames = notConnectedIds
      .map(id => chainIdToName[id])
      .filter(Boolean)
      .sort()

    if (connectedNames.length > 0) {
      prompt += `\n**Connected Networks:** ${connectedNames.join(', ')}`
    }
    if (notConnectedNames.length > 0) {
      prompt += `\n**Not Connected by Wallet (user must add these networks in their wallet to use them):** ${notConnectedNames.join(', ')}`
    }
  }

  return prompt
}

function buildSafeStatusPrompt(safeDeploymentState?: Record<number, SafeChainDeployment>): string {
  if (!safeDeploymentState || Object.keys(safeDeploymentState).length === 0) {
    return '- No Safe smart account configured yet'
  }

  const lines: string[] = []
  const readyChains: string[] = []
  const deployedNotReadyChains: string[] = []
  const notDeployedChains: string[] = []

  for (const chainId of VAULT_EVM_CHAIN_IDS) {
    const state = safeDeploymentState[chainId]
    const networkName = CHAIN_ID_TO_NETWORK[chainId] ?? `chain ${chainId}`
    if (state?.isDeployed && state.modulesEnabled && state.domainVerifierSet) {
      const shortAddr = `${state.safeAddress.slice(0, 6)}...${state.safeAddress.slice(-4)}`
      readyChains.push(`${networkName} (${shortAddr})`)
    } else if (state?.isDeployed) {
      deployedNotReadyChains.push(networkName)
    } else {
      notDeployedChains.push(networkName)
    }
  }

  if (readyChains.length > 0) lines.push(`- Safe ready on: ${readyChains.join(', ')}`)
  if (deployedNotReadyChains.length > 0)
    lines.push(`- Safe deployed but NOT ready (modules/verifier missing) on: ${deployedNotReadyChains.join(', ')}`)
  if (notDeployedChains.length > 0) lines.push(`- Safe NOT deployed on: ${notDeployedChains.join(', ')}`)

  return lines.join('\n')
}

function isSafeReadyOnAnyChain(safeDeploymentState?: Record<number, SafeChainDeployment>): boolean {
  if (!safeDeploymentState) return false
  return Object.values(safeDeploymentState).some(s => s.isDeployed && !!s.safeAddress)
}

function buildSystemPrompt(
  evmAddress?: string,
  solanaAddress?: string,
  approvedChainIds?: string[],
  safeDeploymentState?: Record<number, SafeChainDeployment>,
  dynamicMultichainAddresses?: Record<string, string>
): string {
  return `
${buildConnectedWalletsPrompt(evmAddress, solanaAddress, approvedChainIds, dynamicMultichainAddresses)}

<identity>
You are Sola AI's crypto assistant. You help users with cryptocurrency prices, trading, swaps, portfolios, transaction history, blockchain concepts, and DeFi.

When users ask about non-crypto topics, acknowledge their question briefly, then offer to help with cryptocurrency topics instead.
</identity>

<context>
**Date:** ${format(new Date(), 'yyyy-MM-dd')} (${format(new Date(), 'EEEE, MMMM d, yyyy')})
**Unix Timestamp:** ${getUnixTime(new Date())}

**Safe Wallet Status:**
${buildSafeStatusPrompt(safeDeploymentState)}
${!isSafeReadyOnAnyChain(safeDeploymentState) ? '- No Safe deployed yet on vault chains (Ethereum, Gnosis, Arbitrum). Vault deposit/withdraw need a deployed Safe on that chain.' : '- Safe deployed on at least one vault chain — vault operations can use it where applicable'}
</context>

<response-rules>
- Use markdown formatting (no HTML tags). Use LaTeX ($$...$$) for math equations.
- Preserve exact decimal precision from tool outputs — never round or truncate.
- Show human-readable names only — never display CAIP-10/CAIP-19 identifiers.
- Refer to capabilities in natural language ("check your vault balance"), not by internal tool names ("vaultBalanceTool").
- Keep responses concise: 1-3 sentences for confirmations, short paragraphs for explanations.
- Only share URLs explicitly returned by tool results. If no URL was returned, do not provide one.
- All tools automatically resolve wallet addresses from the connected wallet — specify networks and assets only, never addresses.
- If a tool fails, explain what went wrong and suggest alternatives.
- Insufficient balance errors: show the exact shortage amount.
- No swap rates found: respond "Route not supported or amount too small."
- Timeout or large-result errors: suggest the user narrow the query (shorter date range, specific network, fewer filters).
- For any arithmetic — currency conversions, percentages, sums — use mathCalculator. Portfolio totals are pre-calculated; use totals.overall and totals.byNetwork directly.
</response-rules>

<tool-routing>
Select the single tool matching the user's intent (these names are internal — never mention them to the user):

| Intent | Tool |
|---|---|
| Spot price only — "what is ETH worth" (no swap) | getAssetPricesTool |
| Historical prices / price at past date / price growth over time | getHistoricalPricesTool |
| Detailed market data (UI card) | getAssetsTool |
| Trending/gainers/new coins | getTrendingTokensTool, getTopGainersLosersTool, getNewCoinsTool |
| Trending pools | getTrendingPoolsTool |
| Categories | getCategoriesTool |
| Portfolio balances | portfolioTool |
| Transaction history | transactionHistoryTool |
| Swap or live quotes (token amount: "1 SOL", "quotes for 1 ETH to BTC", compare routes) | initiateSwapTool |
| Swap (USD amount: "$100 worth", "50 dollars") | initiateSwapUsdTool |
| Send tokens | sendTool |
| Receive address / QR | receiveTool |
| Vault deposit/withdraw/balance | vaultDepositTool, vaultWithdrawTool, vaultWithdrawAllTool, vaultBalanceTool |
| Wallet / Safe status | checkWalletCapabilitiesTool |
| Switch network | switchNetworkTool |
| Arithmetic | mathCalculatorTool |
| Sola AI platform info | getSolaAIKnowledgeTool |
| Resolve ENS/address | lookupExternalAddress |

Swaps use Rango only — there are no limit, stop-loss, or TWAP order tools in this build.
</tool-routing>

<tool-ui>
Many tools render UI cards (as noted in their descriptions). After a tool with a UI card executes successfully, respond with one brief natural sentence (e.g., "Here's what I found"). Do not repeat data shown in the card. Only elaborate if the user asks about something not displayed.

For tools without UI cards, format and present data directly in your response.

**Transaction history:** Single call with all parameters. Set types when asking about a specific type.
</tool-ui>

<portfolio-rules>
- Portfolio aggregates **all connected chains** the wallet exposes (EVM, Solana, Bitcoin, Cosmos, Tron, Sui, Starknet, etc.) — not limited to EVM + Solana. One call covers what the backend can see for the user’s connections.
- Only check balances when user says "all my [token]" or explicitly asks for a balance.
- For specific amounts ("swap 10 USDC"), use the exact amount without a balance check first.
</portfolio-rules>

<usd-conversion>
When a user specifies a dollar amount for a **swap** ($X, "X dollars", "X USD worth"), use **initiateSwapUsdTool** — it handles USD→token sizing.

If unsure whether a number is USD or tokens for a swap, ask the user.
</usd-conversion>

<swap-rules>
**Quotes vs spot prices:** If the user mentions swapping, exchanging, bridging, routes, quotes, "how much would I get", or two assets in one question ("1 ETH to BTC"), call **initiateSwapTool** (or initiateSwapUsdTool). Do **not** answer with only getAssetPricesTool — that skips the swap UI and omits Rango routes. **initiateSwapTool** returns live Rango quotes even when the user has not connected a wallet; do not refuse quotes for missing wallet.

**Distinguishing token amounts from USD amounts:**
- Number + token symbol ("100 LINK", "0.5 ETH", "quote 1 ETH to BTC") = crypto amount → initiateSwapTool
- Dollar sign, "dollars", "USD", "worth" ("$100 worth", "$1 of SOL") = USD amount → initiateSwapUsdTool
- Bare number without symbol or dollar sign ("100 of ETH", "500 on WBTC") is ambiguous — ask the user whether they mean USD or token units.

**Network resolution:**
- Obvious native tickers imply their home chain (e.g. SOL→Solana, ETH often Ethereum unless user names an L2, BTC→Bitcoin, ATOM→Cosmos Hub, TRX→Tron, DOGE/LTC/BCH→their chains, SUI→Sui, etc.) — no need to ask when unambiguous.
- One network specified → same-chain swap on that network.
- Two networks or cross-ecosystem pairs → cross-chain when Rango supports a route.
- No network and ambiguous ticker → ask the user.

<example>
- "1 SOL to USDC" → same-chain Solana
- "0.01 BTC to ETH" → cross-chain if Rango quotes (Bitcoin ↔ EVM)
- "1 USDC on Arbitrum to ETH" → same-chain Arbitrum
- "1 ETH to USDC on Arbitrum" → cross-chain (Ethereum → Arbitrum)
</example>

**"Bridge"** means same asset cross-chain (ETH to Arbitrum = ETH→ETH, not ETH→ARB token). Ask for clarification if ambiguous.

After initiating a swap, respond with one brief confirmation sentence. Do not provide rate, fee, or summary details.
- Never put swapper or token logo URLs in markdown image syntax — the swap tool UI already shows them; inline images break layout and look huge in chat.
</swap-rules>

<safe-account>
**Vault (Safe):**
- vaultDeposit: EOA → Safe. vaultWithdraw: Safe → EOA (specific tokens). vaultWithdrawAll: Safe → EOA (per chain).
- Supported vault networks: Ethereum, Gnosis, Arbitrum (see tool schemas).
</safe-account>

<network-capabilities>
Sola AI is **multi-chain end-to-end**. Do **not** tell users the app is limited to “EVM and Solana only.” Coverage depends on **connected wallets**, **Rango** (swaps), and **indexers** (portfolio/history) — if something fails, attribute it to route availability or connection, not an artificial two-ecosystem cap.

| Feature | Scope |
|---|---|
| Prices & market data | Many networks and assets across EVM, Solana, UTXO-style chains, Cosmos-family, Tron, Sui, etc. — use tools; follow whatever symbols/networks the APIs return. |
| Portfolio & history | All chains the user’s **connected wallet** surfaces (EVM, Solana, Bitcoin, Cosmos, Tron, Sui, Starknet, … per Dynamic / multichain context), not just EVM + Solana. |
| Swaps (Rango) | **Broad routing:** EVM↔EVM, EVM↔Solana, UTXO (e.g. BTC) routes, Cosmos routes, Tron, Sui, Starknet, TON, and others **when Rango returns a quote** and the relevant chain is in play. Always call **initiateSwapTool** / **initiateSwapUsdTool** for swap intent — do not refuse solely because the pair is not “EVM+Sol”. |
| Send / receive | Use **sendTool** / **receiveTool** for whatever chain the implementation supports for the connected wallet; treat non-EVM chains as first-class when the user asks. |
| Vault (Safe) | **EVM-only feature:** Ethereum, Gnosis, Arbitrum (see vault tool schemas) — this is the exception, not the default for swaps/portfolio. |

If no route or balance appears: say the chain may need to be connected, the amount may be too small, or Rango may not support that pair — suggest trying another asset or network.
</network-capabilities>
`
}

const chatRequestSchema = z.object({
  id: z.string().optional(),
  messages: z.array(z.record(z.string(), z.unknown())),
  evmAddress: z.string().optional(),
  solanaAddress: z.string().optional(),
  approvedChainIds: z.array(z.string()).optional(),
  safeAddress: z.string().optional(),
  safeDeploymentState: z
    .record(
      z.string(),
      z.object({
        isDeployed: z.boolean(),
        modulesEnabled: z.boolean(),
        domainVerifierSet: z.boolean(),
        safeAddress: z.string(),
      })
    )
    .optional(),
  knownTransactions: z
    .array(
      z.object({
        txHash: z.string(),
        type: z.enum(['swap', 'send', 'limitOrder', 'stopLoss', 'twap', 'deposit', 'withdraw', 'approval']),
        sellSymbol: z.string().optional(),
        sellAmount: z.string().optional(),
        buySymbol: z.string().optional(),
        buyAmount: z.string().optional(),
        network: z.string().optional(),
      })
    )
    .optional(),
  dynamicMultichainAddresses: z.record(z.string(), z.string()).optional(),
  registryOrders: z
    .array(
      z.object({
        orderHash: z.string(),
        chainId: z.number(),
        sellTokenAddress: z.string(),
        sellTokenSymbol: z.string(),
        sellAmountBaseUnit: z.string(),
        sellAmountHuman: z.string(),
        buyTokenAddress: z.string(),
        buyTokenSymbol: z.string(),
        buyAmountHuman: z.string(),
        strikePrice: z.string(),
        validTo: z.number(),
        submitTxHash: z.string(),
        createdAt: z.number(),
        network: z.string(),
        status: z.enum(['open', 'triggered', 'fulfilled', 'cancelled', 'expired', 'failed', 'partiallyFilled']),
        orderType: z.enum(['stopLoss', 'twap']),
        numParts: z.number().optional(),
      })
    )
    .optional(),
})

export async function handleChatRequest(c: Context) {
  try {
    const body = await c.req.json()
    const parsed = chatRequestSchema.safeParse(body)

    if (!parsed.success) {
      return c.json({ error: 'Invalid request body', details: parsed.error.issues }, 400)
    }

    const {
      id: conversationId,
      messages,
      evmAddress,
      solanaAddress,
      approvedChainIds,
      safeAddress,
      safeDeploymentState,
      knownTransactions,
      registryOrders,
      dynamicMultichainAddresses,
    } = parsed.data

    // Build wallet context from addresses (filtered by approved chains if provided)
    const walletContext = buildWalletContextFromChatFields(
      evmAddress,
      solanaAddress,
      approvedChainIds,
      safeAddress,
      safeDeploymentState,
      registryOrders,
      knownTransactions,
      dynamicMultichainAddresses
    )

    console.log('[Chat:request]', {
      conversationId,
      evmAddress: evmAddress ?? '(none)',
      solanaAddress: solanaAddress ?? '(none)',
      approvedChainIds: approvedChainIds ?? '(all)',
      connectedWallets: Object.keys(walletContext.connectedWallets ?? {}),
      messageCount: messages.length,
    })

    // Convert UIMessages to ModelMessages
    const modelMessages = convertToModelMessages(messages as Parameters<typeof convertToModelMessages>[0])

    const model = getModel()
    const tools = buildTools(walletContext)
    console.log('[Chat:stream] model:', (model as any).modelId ?? 'unknown', '| tools:', Object.keys(tools).length, '→', Object.keys(tools).join(', '))

    const result = streamText({
      model,
      messages: modelMessages,
      system: buildSystemPrompt(
        evmAddress,
        solanaAddress,
        approvedChainIds,
        safeDeploymentState,
        dynamicMultichainAddresses
      ),
      temperature: 0.3,
      stopWhen: stepCountIs(5),
      tools,
      experimental_transform: smoothStream({ chunking: 'word', delayInMs: 3 }),
      // Venice-specific parameters to disable reasoning for faster responses
      ...(getProviderName() === 'venice' && {
        providerOptions: {
          venice: {
            venice_parameters: {
              disable_thinking: true,
              include_venice_system_prompt: false,
            },
          },
        },
      }),
      onError: ({ error }) => {
        console.error('[Stream:error] ─────────────────────────────')
        console.error('[Stream:error] raw:', JSON.stringify(error, Object.getOwnPropertyNames(error as object), 2))
        console.error('[Stream:error] type:', typeof error)
        if (error instanceof Error) {
          console.error('[Stream:error] message:', error.message)
          console.error('[Stream:error] name:', error.name)
          if (error.cause) console.error('[Stream:error] cause:', JSON.stringify(error.cause, null, 2))
          if (error.stack) console.error('[Stream:error] stack:', error.stack)
        } else if (error && typeof error === 'object') {
          // AI SDK sometimes passes raw objects, not Error instances
          for (const [key, val] of Object.entries(error as Record<string, unknown>)) {
            console.error(`[Stream:error] .${key}:`, typeof val === 'object' ? JSON.stringify(val, null, 2) : val)
          }
        }
        console.error('[Stream:error] ─────────────────────────────')
      },
      onStepFinish: ({ content, warnings }) => {
        for (const part of content) {
          if (part.type === 'tool-error') {
            const err = part.error
            console.error('[chat tool-error]', {
              toolName: part.toolName,
              toolCallId: part.toolCallId,
              input: part.input,
              error: err instanceof Error ? { message: err.message, name: err.name, stack: err.stack } : err,
            })
          }
        }
        if (warnings?.length) {
          console.warn('[chat LLM warnings]', warnings)
        }
      },
    })

    const streamId = crypto.randomUUID()
    const response = result.toUIMessageStreamResponse()
    const originalStream = response.body

    if (!originalStream || !conversationId) {
      return response
    }

    registerStream(conversationId, streamId)
    const resumable = await createResumableStream(streamId, originalStream)

    const cleanupStream = new TransformStream({
      flush() {
        if (conversationId) clearStream(conversationId)
      },
    })

    return new Response(resumable.pipeThrough(cleanupStream), {
      headers: {
        ...Object.fromEntries(response.headers.entries()),
        'x-stream-id': streamId,
        'x-conversation-id': conversationId,
      },
    })
  } catch (error) {
    const errorDetails = {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
    }
    console.error('[Chat API] Request Error:', errorDetails)
    return c.json({ error: 'Internal server error', details: errorDetails.message }, 500)
  }
}
