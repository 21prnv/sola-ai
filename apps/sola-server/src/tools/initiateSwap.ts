import { fromAssetId } from '@sola-ai/caip'
import type { Asset, GetRateOutput } from '@sola-ai/types'
import { toBigInt, toBaseUnit } from '@sola-ai/utils'
import { encodeFunctionData, erc20Abi, getAddress } from 'viem'
import { z } from 'zod'

import { assetInputSchema } from '../lib/schemas/swapSchemas'
import type { AssetInput, swapPreparationSchema } from '../lib/schemas/swapSchemas'
import { getAllowance } from '../utils'
import { validateAddress } from '../utils/addressValidation'
import { resolveAsset } from '../utils/assetHelpers'
import { validateSufficientBalance } from '../utils/balanceHelpers'
import { isEvmChain } from '../utils/chains/helpers'
import { getRangoQuoteAlternatives, getRangoSwap } from '../utils/getRangoSwap'
import type { GetRangoSwapOptions, RangoQuoteOptionSummary, RangoSwapRate } from '../utils/getRangoSwap'
import { networkToFeeSymbol } from '../utils/networkHelpers'
import { createTransaction } from '../utils/transactionHelpers'
import { getAddressForChain, getAddressForChainOptional } from '../utils/walletContextSimple'
import type { WalletContext } from '../utils/walletContextSimple'

interface ResolvedAssets {
  sellAsset: Asset
  buyAsset: Asset
  sellAssetInput: AssetInput
  buyAssetInput: AssetInput
}

async function resolveSwapAssets(
  sellAssetInput: AssetInput,
  buyAssetInput: AssetInput,
  walletContext?: WalletContext
): Promise<ResolvedAssets> {
  const sellInputWithNetwork = {
    ...sellAssetInput,
    network: sellAssetInput.network || buyAssetInput.network,
  }
  const buyInputWithNetwork = {
    ...buyAssetInput,
    network: buyAssetInput.network || sellAssetInput.network,
  }

  const [sellAsset, buyAsset] = await Promise.all([
    resolveAsset(sellInputWithNetwork, walletContext),
    resolveAsset(buyInputWithNetwork, walletContext),
  ])

  return { sellAsset, buyAsset, sellAssetInput: sellInputWithNetwork, buyAssetInput: buyInputWithNetwork }
}

async function fetchSwapRate(
  sellAddress: string,
  buyAddress: string,
  sellAsset: Asset,
  buyAsset: Asset,
  sellAmount: string,
  rangoOptions?: GetRangoSwapOptions
): Promise<RangoSwapRate> {
  return getRangoSwap(
    {
      address: sellAddress,
      recipientAddress: buyAddress,
      sellAsset,
      buyAsset,
      sellAmountCryptoPrecision: sellAmount,
    },
    rangoOptions
  )
}

type TransactionData = {
  chainId: string
  data: string
  from: string
  to: string
  value: string
}

function buildApprovalTransaction(
  needsApproval: boolean,
  sellAsset: Asset,
  approvalTarget: string,
  sellAmount: string,
  userAddress: string
): TransactionData | undefined {
  if (!needsApproval) {
    return undefined
  }

  if (!isEvmChain(sellAsset.chainId)) {
    return undefined
  }

  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'approve',
    args: [getAddress(approvalTarget), toBigInt(toBaseUnit(sellAmount, sellAsset.precision))],
  })

  const tokenAddress = fromAssetId(sellAsset.assetId).assetReference

  return createTransaction({
    chainId: sellAsset.chainId,
    data,
    from: userAddress,
    to: tokenAddress,
    value: '0',
  })
}

function buildSwapTransaction(bestRate: GetRateOutput) {
  const originalSwapTx = bestRate.unsignedTx

  return createTransaction({
    chainId: originalSwapTx.chainId,
    data: originalSwapTx.data || '',
    from: originalSwapTx.from,
    to: originalSwapTx.to,
    value: originalSwapTx.value || '0',
    ...(originalSwapTx.gasLimit && { gasLimit: String(originalSwapTx.gasLimit) }),
  })
}

function createSwapSummary(sellAsset: Asset, buyAsset: Asset, sellAmount: string, bestRate: GetRateOutput) {
  const sellPrice = parseFloat(sellAsset.price || '0')
  const buyPrice = parseFloat(buyAsset.price || '0')

  const sellValueUSD = sellPrice > 0 ? (parseFloat(sellAmount) * sellPrice).toFixed(2) : null
  const buyEstimatedValueUSD =
    buyPrice > 0 ? (parseFloat(bestRate.buyAmountCryptoPrecision) * buyPrice).toFixed(2) : null
  const exchangeRate = (parseFloat(bestRate.buyAmountCryptoPrecision) / parseFloat(sellAmount)).toFixed(8)

  const priceImpact =
    sellValueUSD && buyEstimatedValueUSD
      ? (((parseFloat(buyEstimatedValueUSD) - parseFloat(sellValueUSD)) / parseFloat(sellValueUSD)) * 100).toFixed(2)
      : null

  const feeSymbol = networkToFeeSymbol[sellAsset.network] || sellAsset.symbol.toUpperCase()

  return {
    sellAsset: {
      symbol: sellAsset.symbol.toUpperCase(),
      amount: sellAmount,
      network: sellAsset.network,
      chainName: sellAsset.name || 'Unknown Chain',
      valueUSD: sellValueUSD || null,
      priceUSD: sellPrice > 0 ? sellPrice.toFixed(4) : null,
    },
    buyAsset: {
      symbol: buyAsset.symbol.toUpperCase(),
      estimatedAmount: bestRate.buyAmountCryptoPrecision,
      network: buyAsset.network,
      chainName: buyAsset.name || 'Unknown Chain',
      estimatedValueUSD: buyEstimatedValueUSD || null,
      priceUSD: buyPrice > 0 ? buyPrice.toFixed(2) : null,
    },
    exchange: {
      provider: bestRate.source || 'Unknown',
      rate: `1 ${sellAsset.symbol.toUpperCase()} = ${exchangeRate} ${buyAsset.symbol.toUpperCase()}`,
      priceImpact: priceImpact || null,
      networkFeeCrypto: bestRate.networkFeeCryptoPrecision,
      networkFeeSymbol: feeSymbol,
      networkFeeUsd: bestRate.networkFeeUsd,
    },
    isCrossChain: sellAsset.network !== buyAsset.network,
  }
}

function createSwapSummaryFromQuote(
  sellAsset: Asset,
  buyAsset: Asset,
  sellAmount: string,
  quote: RangoQuoteOptionSummary
) {
  const sellPrice = parseFloat(sellAsset.price || '0')
  const buyPrice = parseFloat(buyAsset.price || '0')
  const sellValueUSD = sellPrice > 0 ? (parseFloat(sellAmount) * sellPrice).toFixed(2) : null
  const buyEstimatedValueUSD =
    quote.outputAmountUsd != null
      ? quote.outputAmountUsd.toFixed(2)
      : buyPrice > 0
        ? (parseFloat(quote.outputAmount) * buyPrice).toFixed(2)
        : null
  const exchangeRate = (parseFloat(quote.outputAmount) / parseFloat(sellAmount)).toFixed(8)

  const priceImpact =
    sellValueUSD && buyEstimatedValueUSD
      ? (((parseFloat(buyEstimatedValueUSD) - parseFloat(sellValueUSD)) / parseFloat(sellValueUSD)) * 100).toFixed(2)
      : null

  const feeSymbol = networkToFeeSymbol[sellAsset.network] || sellAsset.symbol.toUpperCase()

  return {
    sellAsset: {
      symbol: sellAsset.symbol.toUpperCase(),
      amount: sellAmount,
      network: sellAsset.network,
      chainName: sellAsset.name || 'Unknown Chain',
      valueUSD: sellValueUSD || null,
      priceUSD: sellPrice > 0 ? sellPrice.toFixed(4) : null,
    },
    buyAsset: {
      symbol: buyAsset.symbol.toUpperCase(),
      estimatedAmount: quote.outputAmount,
      network: buyAsset.network,
      chainName: buyAsset.name || 'Unknown Chain',
      estimatedValueUSD: buyEstimatedValueUSD || null,
      priceUSD: buyPrice > 0 ? buyPrice.toFixed(2) : null,
    },
    exchange: {
      provider:
        quote.resultType === 'HIGH_IMPACT' || quote.resultType === 'HIGH_IMPACT_FOR_CREATE_TX'
          ? `${quote.swapperTitle} (high impact)`
          : quote.swapperTitle,
      rate: `1 ${sellAsset.symbol.toUpperCase()} = ${exchangeRate} ${buyAsset.symbol.toUpperCase()}`,
      priceImpact: priceImpact || null,
      networkFeeSymbol: feeSymbol,
      networkFeeUsd: quote.feeUsd != null ? String(quote.feeUsd) : undefined,
    },
    isCrossChain: sellAsset.network !== buyAsset.network,
  }
}

async function finalizeSwapPreparationFromResolved(
  sellAsset: Asset,
  buyAsset: Asset,
  sellAmountCrypto: string,
  walletContext: WalletContext | undefined,
  rangoOptions?: GetRangoSwapOptions
): Promise<z.infer<typeof swapPreparationSchema>> {
  const sellAddress = getAddressForChain(walletContext, sellAsset.chainId)
  const buyAddress = getAddressForChain(walletContext, buyAsset.chainId)

  validateAddress(sellAddress, sellAsset.chainId)
  validateAddress(buyAddress, buyAsset.chainId)

  const bestRate = await fetchSwapRate(sellAddress, buyAddress, sellAsset, buyAsset, sellAmountCrypto, rangoOptions)

  const allowanceData = await getAllowance({
    amount: toBaseUnit(sellAmountCrypto, sellAsset.precision),
    asset: sellAsset,
    from: sellAddress,
    spender: bestRate.approvalTarget,
  })

  const needsApproval = allowanceData.isApprovalRequired

  await validateSufficientBalance(sellAddress, sellAsset, sellAmountCrypto)

  const approvalTx = needsApproval
    ? (bestRate.approvalTxOverride ??
      buildApprovalTransaction(true, sellAsset, bestRate.approvalTarget, sellAmountCrypto, sellAddress))
    : undefined

  const swapTx = buildSwapTransaction(bestRate)

  const summary = createSwapSummary(sellAsset, buyAsset, sellAmountCrypto, bestRate)

  const sellPrice = parseFloat(sellAsset.price || '0')
  const buyPrice = parseFloat(buyAsset.price || '0')
  const sellValueUSD = sellPrice > 0 ? (parseFloat(sellAmountCrypto) * sellPrice).toFixed(2) : undefined
  const buyEstimatedValueUSD =
    buyPrice > 0 ? (parseFloat(bestRate.buyAmountCryptoPrecision) * buyPrice).toFixed(2) : undefined

  const swapExecutionData = {
    sellAmountCryptoPrecision: sellAmountCrypto,
    buyAmountCryptoPrecision: bestRate.buyAmountCryptoPrecision,
    sellAmountUsd: sellValueUSD,
    buyAmountUsd: buyEstimatedValueUSD,
    approvalTarget: bestRate.approvalTarget,
    sellAsset,
    buyAsset,
    sellAccount: sellAddress,
    buyAccount: buyAddress,
  }

  return {
    summary,
    needsApproval,
    approvalTx,
    swapTx,
    swapData: swapExecutionData,
    awaitingRouteSelection: false,
  }
}

function logInitiateSwapError(context: string, err: unknown, extra?: Record<string, unknown>): void {
  const base =
    err instanceof Error ? { message: err.message, name: err.name, stack: err.stack } : { message: String(err) }
  console.error(`[initiateSwap] ${context}`, { ...base, ...extra })
}

async function executeSwapInternal({
  sellAssetInput,
  buyAssetInput,
  sellAmountCrypto,
  slippagePercent,
  walletContext,
}: {
  sellAssetInput: AssetInput
  buyAssetInput: AssetInput
  sellAmountCrypto: string
  slippagePercent?: number
  walletContext?: WalletContext
}): Promise<z.infer<typeof swapPreparationSchema>> {
  if (!Number.isFinite(parseFloat(sellAmountCrypto)) || parseFloat(sellAmountCrypto) <= 0) {
    throw new Error('Sell amount must be a positive number')
  }

  let sellAsset: Asset
  let buyAsset: Asset
  let sellIn: AssetInput
  let buyIn: AssetInput

  try {
    const resolved = await resolveSwapAssets(sellAssetInput, buyAssetInput, walletContext)
    sellAsset = resolved.sellAsset
    buyAsset = resolved.buyAsset
    sellIn = resolved.sellAssetInput
    buyIn = resolved.buyAssetInput
  } catch (err) {
    logInitiateSwapError('resolveSwapAssets failed', err, {
      sellAssetInput,
      buyAssetInput,
      sellAmountCrypto,
    })
    throw err
  }

  // Rango `quote()` does not use wallet addresses; only `swap()` does. Allow quote previews
  // without a connected wallet so users can compare routes before connecting.
  const sellAddress = getAddressForChainOptional(walletContext, sellAsset.chainId)
  const buyAddress = getAddressForChainOptional(walletContext, buyAsset.chainId)

  try {
    if (sellAddress) validateAddress(sellAddress, sellAsset.chainId)
    if (buyAddress) validateAddress(buyAddress, buyAsset.chainId)
  } catch (err) {
    logInitiateSwapError('validateAddress failed', err, {
      sellChainId: sellAsset.chainId,
      buyChainId: buyAsset.chainId,
      hasSellAddress: Boolean(sellAddress),
      hasBuyAddress: Boolean(buyAddress),
    })
    throw err
  }

  console.log('[initiateSwap] quote request', {
    sell: {
      assetId: sellAsset.assetId,
      symbol: sellAsset.symbol,
      chainId: sellAsset.chainId,
      network: sellAsset.network,
    },
    buy: { assetId: buyAsset.assetId, symbol: buyAsset.symbol, chainId: buyAsset.chainId, network: buyAsset.network },
    sellAmountCrypto,
    sellAddress: sellAddress ?? '(none)',
    buyAddress: buyAddress ?? '(none)',
  })

  let quoteOptions: RangoQuoteOptionSummary[]
  try {
    quoteOptions = await getRangoQuoteAlternatives(
      {
        address: sellAddress ?? '',
        recipientAddress: buyAddress ?? '',
        sellAsset,
        buyAsset,
        sellAmountCryptoPrecision: sellAmountCrypto,
      },
      {}
    )
  } catch (err) {
    logInitiateSwapError('getRangoQuoteAlternatives failed', err, {
      sellAssetId: sellAsset.assetId,
      buyAssetId: buyAsset.assetId,
      sellAmountCrypto,
    })
    throw err
  }

  if (quoteOptions.length === 0) {
    console.error(
      '[initiateSwap] no quotes returned — inspect [Rango quotes] logs for resultType (e.g. NO_ROUTE), error, errorCode',
      {
        sellAssetId: sellAsset.assetId,
        buyAssetId: buyAsset.assetId,
        sellAmountCrypto,
      }
    )
    throw new Error('No swap routes found from Rango for this pair and amount.')
  }

  const summary = createSwapSummaryFromQuote(sellAsset, buyAsset, sellAmountCrypto, quoteOptions[0]!)

  return {
    summary,
    awaitingRouteSelection: true,
    quoteOptions,
    routeBuildContext: {
      sellAsset,
      buyAsset,
      sellAssetInput: sellIn,
      buyAssetInput: buyIn,
      sellAmountCrypto,
      sellAccount: sellAddress ?? '',
      buyAccount: buyAddress ?? '',
      slippagePercent,
    },
  }
}

/** Build executable swap tx after the user picks a Rango route (see `awaitingRouteSelection`). */
export async function executeSwapRouteBuild(
  input: {
    sellAsset: AssetInput
    buyAsset: AssetInput
    sellAmountCrypto: string
    selectedSwapperId: string
    slippagePercent?: number
  },
  walletContext?: WalletContext
): Promise<z.infer<typeof swapPreparationSchema>> {
  const sid = input.selectedSwapperId?.trim()
  if (!sid) {
    throw new Error('Missing route (swapper) selection.')
  }

  if (!Number.isFinite(parseFloat(input.sellAmountCrypto)) || parseFloat(input.sellAmountCrypto) <= 0) {
    throw new Error('Sell amount must be a positive number')
  }

  const { sellAsset, buyAsset } = await resolveSwapAssets(input.sellAsset, input.buyAsset, walletContext)

  return finalizeSwapPreparationFromResolved(sellAsset, buyAsset, input.sellAmountCrypto, walletContext, {
    swappers: [sid],
    swappersExclude: false,
    slippagePercent: input.slippagePercent,
  })
}

export const initiateSwapSchema = z.object({
  sellAsset: assetInputSchema.describe('Asset to sell'),
  buyAsset: assetInputSchema.describe('Asset to buy'),
  sellAmount: z.string().describe('Amount to sell in crypto tokens, e.g. 1 for 1 ETH, 0.5 for 0.5 SOL'),
  slippagePercent: z
    .number()
    .min(0.05)
    .max(50)
    .optional()
    .describe(
      'Optional max slippage as a percent (e.g. 0.5 for 0.5%). Only set when the user specifies it in the prompt ("with 1% slippage", "slippage 0.3%", "allow up to 5% slippage"). Omit otherwise to use the system default.'
    ),
})

export type InitiateSwapInput = z.infer<typeof initiateSwapSchema>
export type InitiateSwapOutput = z.infer<typeof swapPreparationSchema>

export async function executeInitiateSwap(
  input: InitiateSwapInput,
  walletContext?: WalletContext
): Promise<InitiateSwapOutput> {
  return executeSwapInternal({
    sellAssetInput: input.sellAsset,
    buyAssetInput: input.buyAsset,
    sellAmountCrypto: input.sellAmount,
    slippagePercent: input.slippagePercent,
    walletContext,
  })
}

export const initiateSwapTool = {
  description: `Swap or get live swap quotes between tokens (crypto amounts) via Rango. EVM and Solana only.

Quotes use Rango's quote API and work even when the user has not connected a wallet; building the transaction requires a connected wallet with addresses for both chains.

Use whenever the user asks for quotes, routes, "best way" to swap, how much they would receive, or to compare providers — not getAssetPrices.

The UI lists multiple Rango routes (fees, ETA, steps, provider) like an aggregator; the user picks one, then the app builds the transaction.

SLIPPAGE: if the user specifies a slippage tolerance (e.g. "with 0.5% slippage", "slippage 1%", "allow 5% slippage"), pass it as \`slippagePercent\`. Otherwise omit it — the backend falls back to the system default.

UI CARD DISPLAYS: route cards, sell/buy amounts, exchange rate, network fees, and price impact.`,
  inputSchema: initiateSwapSchema,
  execute: executeInitiateSwap,
}

export const initiateSwapUsdSchema = z.object({
  sellAsset: assetInputSchema.describe('Asset to sell'),
  buyAsset: assetInputSchema.describe('Asset to buy'),
  sellAmountUsd: z.string().describe('USD value to swap, e.g. "100" for $100 worth, "1.50" for $1.50 worth'),
  slippagePercent: z
    .number()
    .min(0.05)
    .max(50)
    .optional()
    .describe(
      'Optional max slippage as a percent (e.g. 0.5 for 0.5%). Only set when the user specifies it in the prompt ("with 1% slippage", "slippage 0.3%"). Omit otherwise to use the system default.'
    ),
})

export type InitiateSwapUsdInput = z.infer<typeof initiateSwapUsdSchema>
export type InitiateSwapUsdOutput = z.infer<typeof swapPreparationSchema>

export async function executeInitiateSwapUsd(
  input: InitiateSwapUsdInput,
  walletContext?: WalletContext
): Promise<InitiateSwapUsdOutput> {
  const { sellAsset: sellAssetInput, buyAsset: buyAssetInput, sellAmountUsd } = input

  if (!Number.isFinite(parseFloat(sellAmountUsd)) || parseFloat(sellAmountUsd) <= 0) {
    throw new Error('USD amount must be a positive number')
  }

  const sellAsset = await resolveAsset(sellAssetInput, walletContext)
  const sellAssetPrice = parseFloat(sellAsset.price || '0')

  if (sellAssetPrice <= 0) {
    throw new Error(`Unable to fetch price for ${sellAsset.symbol}. Price data may be unavailable.`)
  }

  const sellAmountCrypto = (parseFloat(sellAmountUsd) / sellAssetPrice).toString()

  return executeSwapInternal({
    sellAssetInput,
    buyAssetInput,
    sellAmountCrypto,
    slippagePercent: input.slippagePercent,
    walletContext,
  })
}

export const initiateSwapUsdTool = {
  description: `Swap or get live quotes when the user gives a USD notional ($100 worth, etc.) via Rango. EVM and Solana only.

Quotes work without a connected wallet; executing the swap requires a wallet.

Use for dollar-denominated swap/quote requests; the UI shows multiple Rango routes for the computed token amount.

SLIPPAGE: if the user specifies a slippage tolerance (e.g. "with 0.5% slippage"), pass it as \`slippagePercent\`. Otherwise omit it — the backend falls back to the system default.

UI CARD DISPLAYS: route cards, sell/buy amounts, exchange rate, network fees, and price impact.`,
  inputSchema: initiateSwapUsdSchema,
  execute: executeInitiateSwapUsd,
}
