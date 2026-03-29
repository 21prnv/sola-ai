import {
  ASSET_NAMESPACE,
  CHAIN_NAMESPACE,
  type ChainId,
  fromAssetId,
  fromChainId,
} from '@sola-ai/caip'
import type { Asset, GetRateInput, GetRateOutput } from '@sola-ai/types'
import { getFeeAssetIdByChainId, toBaseUnit } from '@sola-ai/utils'
import { RangoClient } from 'rango-sdk-basic'
import type { BlockchainMeta } from 'rango-types/basicApi'
import { RoutingResultType, TransactionType, type SolanaInstruction, type SolanaInstructionKey } from 'rango-types/basicApi'
import { decodeFunctionData, erc20Abi, getAddress } from 'viem'

import type { TransactionData } from '../../lib/schemas/swapSchemas'

import { getCachedRangoBlockchains, resolveRangoBlockchainName } from './rangoBlockchainResolver'

let rangoClient: RangoClient | undefined

export function getRangoClient(): RangoClient {
  if (!rangoClient) {
    const apiKey = process.env.RANGO_API_KEY?.trim()
    if (!apiKey) {
      throw new Error(
        '[Rango] RANGO_API_KEY is missing. Add it to Sola-AI/.env (see https://docs.rango.exchange/api-integration/basic-api-single-step/tutorial/sdk-example).'
      )
    }
    rangoClient = new RangoClient(apiKey)
  }
  return rangoClient
}

type RangoRequestedAsset = { blockchain: string; address: string | null; symbol?: string }

/** Rango Basic API expects native assets as `BLOCKCHAIN.TICKER` (e.g. ETH.ETH, SOLANA.SOL) via SDK `assetToString`. */
function rangoNativeTicker(asset: Asset): string | undefined {
  const s = asset.symbol?.trim()
  return s ? s.toUpperCase() : undefined
}

/** Human crypto amount → smallest units string (matches BiorSwap `amount.assetAmount.toString()` for Rango). */
function rangoSellAmountSmallestUnits(sellAsset: Asset, sellAmountCryptoPrecision: string): string {
  return toBaseUnit(sellAmountCryptoPrecision, sellAsset.precision)
}

export function assetToRangoAsset(asset: Asset, blockchains: BlockchainMeta[]): RangoRequestedAsset {
  const blockchain = resolveRangoBlockchainName(blockchains, asset.chainId as ChainId)
  const { chainNamespace } = fromChainId(asset.chainId)
  const feeAssetId = getFeeAssetIdByChainId(asset.chainId)

  if (feeAssetId && asset.assetId === feeAssetId) {
    const base: RangoRequestedAsset = { blockchain, address: null }
    if (chainNamespace === CHAIN_NAMESPACE.CosmosSdk) {
      base.symbol = asset.symbol
    } else {
      const t = rangoNativeTicker(asset)
      if (t) base.symbol = t
    }
    return base
  }

  const { assetNamespace, assetReference } = fromAssetId(asset.assetId)

  if (chainNamespace === CHAIN_NAMESPACE.Evm) {
    if (assetNamespace === ASSET_NAMESPACE.erc20) {
      return { blockchain, address: getAddress(assetReference) }
    }
    throw new Error(`Unsupported EVM asset namespace for Rango: ${assetNamespace}`)
  }

  if (chainNamespace === CHAIN_NAMESPACE.Solana) {
    if (assetNamespace === ASSET_NAMESPACE.slip44) {
      const t = rangoNativeTicker(asset)
      return { blockchain, address: null, ...(t ? { symbol: t } : {}) }
    }
    if (assetNamespace === ASSET_NAMESPACE.splToken) {
      return { blockchain, address: assetReference }
    }
    throw new Error(`Unsupported Solana asset namespace for Rango: ${assetNamespace}`)
  }

  if (chainNamespace === CHAIN_NAMESPACE.CosmosSdk) {
    if (assetNamespace === ASSET_NAMESPACE.slip44) {
      return { blockchain, address: null, symbol: asset.symbol }
    }
    if (assetNamespace === ASSET_NAMESPACE.ibc) {
      return { blockchain, address: assetReference, symbol: asset.symbol }
    }
    throw new Error(`Unsupported Cosmos asset namespace for Rango: ${assetNamespace}`)
  }

  if (chainNamespace === CHAIN_NAMESPACE.Tron) {
    if (assetNamespace === ASSET_NAMESPACE.slip44) {
      const t = rangoNativeTicker(asset)
      return { blockchain, address: null, ...(t ? { symbol: t } : {}) }
    }
    if (assetNamespace === ASSET_NAMESPACE.trc20) {
      return { blockchain, address: getAddress(assetReference) }
    }
    throw new Error(`Unsupported Tron asset namespace for Rango: ${assetNamespace}`)
  }

  if (chainNamespace === CHAIN_NAMESPACE.Sui) {
    if (assetNamespace === ASSET_NAMESPACE.slip44) {
      const t = rangoNativeTicker(asset)
      return { blockchain, address: null, ...(t ? { symbol: t } : {}) }
    }
    if (assetNamespace === ASSET_NAMESPACE.suiToken) {
      return { blockchain, address: assetReference }
    }
    throw new Error(`Unsupported Sui asset namespace for Rango: ${assetNamespace}`)
  }

  if (chainNamespace === CHAIN_NAMESPACE.Utxo) {
    if (assetNamespace === ASSET_NAMESPACE.slip44) {
      const t = rangoNativeTicker(asset)
      return { blockchain, address: null, ...(t ? { symbol: t } : {}) }
    }
    throw new Error(`Unsupported UTXO asset namespace for Rango: ${assetNamespace}`)
  }

  if (chainNamespace === CHAIN_NAMESPACE.Cardano) {
    throw new Error('Cardano assets are not supported for Rango swaps in this integration.')
  }

  const ns = chainNamespace as string
  if (ns === 'starknet') {
    if (assetNamespace === ASSET_NAMESPACE.slip44) {
      const t = rangoNativeTicker(asset)
      return { blockchain, address: null, ...(t ? { symbol: t } : {}) }
    }
    return { blockchain, address: assetReference }
  }
  if (ns === 'ton' || ns === 'xrpl' || ns === 'xrp' || ns === 'stellar') {
    const native = assetReference === 'native'
    const t = native ? rangoNativeTicker(asset) : undefined
    return {
      blockchain,
      address: native ? null : assetReference,
      ...(t ? { symbol: t } : {}),
    }
  }

  throw new Error(`Unsupported chain namespace for Rango asset mapping: ${chainNamespace}`)
}

function decodeApproveSpender(approveData: string | null): string | null {
  if (!approveData || approveData === '0x') return null
  try {
    const decoded = decodeFunctionData({
      abi: erc20Abi,
      data: approveData as `0x${string}`,
    })
    if (decoded.functionName === 'approve') {
      return getAddress(decoded.args[0] as string)
    }
  } catch {
    return null
  }
  return null
}

export type RangoSwapRate = GetRateOutput & {
  /** When present, send this approval tx instead of a generic ERC20 approve (Rango-calldata). */
  approvalTxOverride?: TransactionData
}

export type GetRangoSwapOptions = {
  slippagePercent?: number
  disableEstimate?: boolean
  /** When set with `swappersExclude: false`, Rango restricts routing to these swappers (used after user picks a quote). */
  swappers?: string[]
  swappersExclude?: boolean
}

export function defaultRangoSlippagePercent(): number {
  const raw = process.env.RANGO_SLIPPAGE_PERCENT?.trim()
  if (!raw) return 1.5
  const n = Number.parseFloat(raw)
  return Number.isFinite(n) && n > 0 ? n : 1.5
}

function maxQuoteAlternatives(): number {
  const raw = process.env.RANGO_MAX_QUOTE_ALTERNATIVES?.trim()
  if (!raw) return 5
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n >= 1 && n <= 12 ? n : 5
}

const ROUTE_PREVIEW_OK_TYPES: RoutingResultType[] = [
  RoutingResultType.OK,
  RoutingResultType.HIGH_IMPACT,
  RoutingResultType.HIGH_IMPACT_FOR_CREATE_TX,
]

function logRangoQuoteError(context: string, err: unknown, extra?: Record<string, unknown>): void {
  const base =
    err instanceof Error
      ? { message: err.message, name: err.name, stack: err.stack }
      : { message: String(err) }
  console.error(`[Rango quotes] ${context}`, { ...base, ...extra })
}

/** One Rango `quote()` outcome for UI route selection (BiorSwap-style multi-quote preview). */
export type RangoQuoteOptionSummary = {
  swapperId: string
  swapperTitle: string
  swapperLogo?: string
  outputAmount: string
  outputAmountMin: string
  outputAmountUsd: number | null
  feeUsd: number | null
  estimatedTimeSeconds: number
  /** Routing hops from Rango `path` (1 when path is null / single-hop). */
  pathStepCount: number
  resultType: string
}

/**
 * Fetches multiple distinct Rango quotes by excluding the previous best swapper each iteration
 * (Basic API has no multi-quote endpoint; this mirrors common aggregator UX).
 */
export async function getRangoQuoteAlternatives(
  input: GetRateInput & { recipientAddress?: string },
  options?: { slippagePercent?: number }
): Promise<RangoQuoteOptionSummary[]> {
  const { buyAsset, sellAsset, sellAmountCryptoPrecision } = input
  const rango = getRangoClient()

  let from: ReturnType<typeof assetToRangoAsset>
  let to: ReturnType<typeof assetToRangoAsset>
  let blockchains: Awaited<ReturnType<typeof getCachedRangoBlockchains>>

  try {
    blockchains = await getCachedRangoBlockchains(rango)
    from = assetToRangoAsset(sellAsset, blockchains)
    to = assetToRangoAsset(buyAsset, blockchains)
  } catch (err) {
    logRangoQuoteError('asset mapping / meta() failed', err, {
      sellAssetId: sellAsset.assetId,
      buyAssetId: buyAsset.assetId,
      sellSymbol: sellAsset.symbol,
      buySymbol: buyAsset.symbol,
    })
    throw err
  }

  const slippage = options?.slippagePercent ?? defaultRangoSlippagePercent()
  const amountSmallest = rangoSellAmountSmallestUnits(sellAsset, sellAmountCryptoPrecision)
  const excludedSwappers: string[] = []
  const quotes: RangoQuoteOptionSummary[] = []
  const max = maxQuoteAlternatives()

  console.log('[Rango quotes] start', {
    from,
    to,
    amountHuman: sellAmountCryptoPrecision,
    amountSmallestUnits: amountSmallest,
    slippage,
    maxIterations: max,
    sellAssetId: sellAsset.assetId,
    buyAssetId: buyAsset.assetId,
  })

  for (let i = 0; i < max; i++) {
    let q: Awaited<ReturnType<RangoClient['quote']>>
    try {
      q = await rango.quote({
        from,
        to,
        amount: amountSmallest,
        slippage,
        ...(excludedSwappers.length > 0 ? { swappers: excludedSwappers, swappersExclude: true } : {}),
      })
    } catch (err) {
      logRangoQuoteError(`rango.quote() threw (iteration ${i})`, err, {
        from,
        to,
        amountHuman: sellAmountCryptoPrecision,
        amountSmallestUnits: amountSmallest,
        excludedSwappers,
      })
      break
    }

    console.log('[Rango quotes] iteration', i, {
      resultType: q.resultType,
      requestId: q.requestId,
      traceId: q.traceId,
      error: q.error,
      errorCode: q.errorCode,
      hasRoute: Boolean(q.route),
      swapperId: q.route?.swapper?.id,
      swapperTitle: q.route?.swapper?.title,
    })

    if (!ROUTE_PREVIEW_OK_TYPES.includes(q.resultType) || !q.route) {
      console.warn('[Rango quotes] stop: route not usable', {
        iteration: i,
        resultType: q.resultType,
        apiError: q.error,
        errorCode: q.errorCode,
        okTypes: ROUTE_PREVIEW_OK_TYPES,
      })
      break
    }

    const swapperId = q.route.swapper?.id
    if (!swapperId) {
      console.warn('[Rango quotes] stop: missing swapper id on route', { iteration: i, requestId: q.requestId })
      break
    }

    if (excludedSwappers.includes(swapperId)) {
      console.warn('[Rango quotes] stop: duplicate swapper', { iteration: i, swapperId })
      break
    }

    const pathLen = q.route.path?.length ?? 0
    const pathStepCount = pathLen > 0 ? pathLen : 1

    quotes.push({
      swapperId,
      swapperTitle: q.route.swapper?.title || swapperId,
      swapperLogo: q.route.swapper?.logo,
      outputAmount: q.route.outputAmount,
      outputAmountMin: q.route.outputAmountMin,
      outputAmountUsd: q.route.outputAmountUsd,
      feeUsd: q.route.feeUsd,
      estimatedTimeSeconds: q.route.estimatedTimeInSeconds,
      pathStepCount,
      resultType: q.resultType,
    })

    excludedSwappers.push(swapperId)
  }

  console.log('[Rango quotes] finished', {
    quoteCount: quotes.length,
    swappers: quotes.map(r => r.swapperId),
  })

  return quotes
}

function cloneForJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

/** Client decodes this via `parseSolaRangoEnvelope` and signs with Keplr / TronLink / Starknet / TON / UTXO wallets. */
function packRangoWalletEnvelope(
  chainId: string,
  from: string,
  rangoType: 'COSMOS' | 'TRON' | 'TRANSFER' | 'STARKNET' | 'TON',
  tx: unknown
): GetRateOutput['unsignedTx'] {
  return {
    chainId,
    from,
    to: '',
    value: '0',
    data: JSON.stringify({ v: 1, rangoType, tx: cloneForJson(tx) }),
  }
}

/**
 * Single swap quote + executable tx via [Rango Basic SDK](https://docs.rango.exchange/api-integration/basic-api-single-step/tutorial/sdk-example).
 * Chain ids are resolved from Rango `meta()` so any [integration-listed](https://docs.rango.exchange/integrations) chain id returned by the API is supported.
 */
export async function getRangoSwap(
  input: GetRateInput & { recipientAddress?: string },
  swapOptions?: GetRangoSwapOptions
): Promise<RangoSwapRate> {
  const { address, recipientAddress, buyAsset, sellAsset, sellAmountCryptoPrecision } = input
  const rango = getRangoClient()
  const blockchains = await getCachedRangoBlockchains(rango)

  const from = assetToRangoAsset(sellAsset, blockchains)
  const to = assetToRangoAsset(buyAsset, blockchains)
  const fromAddress = address
  const toAddress = recipientAddress || address
  const slippage = swapOptions?.slippagePercent ?? defaultRangoSlippagePercent()
  const disableEstimate = swapOptions?.disableEstimate ?? false

  const swapperFilter =
    swapOptions?.swappers != null && swapOptions.swappers.length > 0
      ? { swappers: swapOptions.swappers, swappersExclude: swapOptions.swappersExclude ?? false }
      : {}

  const amountSmallest = rangoSellAmountSmallestUnits(sellAsset, sellAmountCryptoPrecision)

  const swap = await rango.swap({
    from,
    to,
    amount: amountSmallest,
    fromAddress,
    toAddress,
    slippage,
    disableEstimate,
    referrerAddress: null,
    referrerFee: null,
    ...swapperFilter,
  })

  const ok =
    swap.resultType === RoutingResultType.OK ||
    swap.resultType === RoutingResultType.HIGH_IMPACT ||
    swap.resultType === RoutingResultType.HIGH_IMPACT_FOR_CREATE_TX

  if (!ok || !swap.tx || swap.error) {
    throw new Error(swap.error || `Rango: no route (${swap.resultType})`)
  }

  const route = swap.route
  if (!route) {
    throw new Error('Rango: missing route on swap response')
  }

  const buyAmountCryptoPrecision = route.outputAmount
  const swapperLabel = route.swapper?.title || route.swapper?.id || 'Rango'

  const firstFee = route.fee?.[0]
  const networkFeeCryptoPrecision = firstFee?.amount
  const networkFeeUsd = route.feeUsd != null ? String(route.feeUsd) : undefined

  if (swap.tx.type === TransactionType.EVM) {
    const tx = swap.tx

    let approvalTarget = ''
    if (tx.approveData && tx.approveTo) {
      const spender = decodeApproveSpender(tx.approveData)
      if (!spender) {
        throw new Error('Rango: could not decode ERC20 approve spender from approveData')
      }
      approvalTarget = spender
    } else {
      const feeId = getFeeAssetIdByChainId(sellAsset.chainId)
      const isNativeSell = Boolean(feeId && sellAsset.assetId === feeId)
      if (!isNativeSell) {
        approvalTarget = getAddress(tx.txTo)
      }
    }

    const approvalTxOverride: TransactionData | undefined =
      tx.approveData && tx.approveTo && tx.from
        ? {
            chainId: sellAsset.chainId,
            from: tx.from,
            to: getAddress(tx.approveTo),
            data: tx.approveData as `0x${string}`,
            value: '0',
            ...(tx.gasLimit && { gasLimit: tx.gasLimit }),
          }
        : undefined

    const unsignedTx: GetRateOutput['unsignedTx'] = {
      chainId: sellAsset.chainId,
      from: tx.from || fromAddress,
      to: getAddress(tx.txTo),
      data: (tx.txData || '0x') as string,
      value: tx.value || '0',
      ...(tx.gasLimit && { gasLimit: Number(tx.gasLimit) }),
    }

    return {
      approvalTarget,
      buyAsset,
      buyAmountCryptoPrecision,
      sellAsset,
      sellAmountCryptoPrecision,
      source: swapperLabel,
      unsignedTx,
      networkFeeCryptoPrecision,
      networkFeeUsd,
      approvalTxOverride,
    }
  }

  if (swap.tx.type === TransactionType.SOLANA) {
    const tx = swap.tx
    const payload = {
      instructions: tx.instructions.map((ix: SolanaInstruction) => ({
        programId: ix.programId,
        keys: ix.keys.map((k: SolanaInstructionKey) => ({
          pubkey: k.pubkey,
          isSigner: k.isSigner,
          isWritable: k.isWritable,
        })),
        data: Buffer.from(ix.data).toString('hex'),
      })),
    }

    return {
      approvalTarget: '',
      buyAsset,
      buyAmountCryptoPrecision,
      sellAsset,
      sellAmountCryptoPrecision,
      source: swapperLabel,
      unsignedTx: {
        chainId: sellAsset.chainId,
        data: JSON.stringify(payload),
        from: tx.from,
        to: '',
        value: '0',
      },
      networkFeeCryptoPrecision,
      networkFeeUsd,
    }
  }

  if (swap.tx.type === TransactionType.COSMOS) {
    const tx = swap.tx
    return {
      approvalTarget: '',
      buyAsset,
      buyAmountCryptoPrecision,
      sellAsset,
      sellAmountCryptoPrecision,
      source: swapperLabel,
      unsignedTx: packRangoWalletEnvelope(sellAsset.chainId, tx.fromWalletAddress, 'COSMOS', tx),
      networkFeeCryptoPrecision,
      networkFeeUsd,
    }
  }

  if (swap.tx.type === TransactionType.TRANSFER) {
    const tx = swap.tx
    return {
      approvalTarget: '',
      buyAsset,
      buyAmountCryptoPrecision,
      sellAsset,
      sellAmountCryptoPrecision,
      source: swapperLabel,
      unsignedTx: packRangoWalletEnvelope(sellAsset.chainId, tx.fromWalletAddress, 'TRANSFER', tx),
      networkFeeCryptoPrecision,
      networkFeeUsd,
    }
  }

  if (swap.tx.type === TransactionType.STARKNET) {
    const tx = swap.tx
    return {
      approvalTarget: '',
      buyAsset,
      buyAmountCryptoPrecision,
      sellAsset,
      sellAmountCryptoPrecision,
      source: swapperLabel,
      unsignedTx: packRangoWalletEnvelope(sellAsset.chainId, fromAddress, 'STARKNET', tx),
      networkFeeCryptoPrecision,
      networkFeeUsd,
    }
  }

  if (swap.tx.type === TransactionType.TRON) {
    const tx = swap.tx
    return {
      approvalTarget: '',
      buyAsset,
      buyAmountCryptoPrecision,
      sellAsset,
      sellAmountCryptoPrecision,
      source: swapperLabel,
      unsignedTx: packRangoWalletEnvelope(sellAsset.chainId, fromAddress, 'TRON', tx),
      networkFeeCryptoPrecision,
      networkFeeUsd,
    }
  }

  if (swap.tx.type === TransactionType.TON) {
    const tx = swap.tx
    return {
      approvalTarget: '',
      buyAsset,
      buyAmountCryptoPrecision,
      sellAsset,
      sellAmountCryptoPrecision,
      source: swapperLabel,
      unsignedTx: packRangoWalletEnvelope(sellAsset.chainId, tx.from ?? fromAddress, 'TON', tx),
      networkFeeCryptoPrecision,
      networkFeeUsd,
    }
  }

  throw new Error(`Rango: unsupported transaction type "${(swap.tx as { type: string }).type}" for this integration.`)
}

/**
 * Same-chain send via Rango (sell asset === buy asset, recipient = counterparty).
 * Produces the same tx shapes as swap (EVM/Solana native, or COSMOS/TRANSFER/TRON/STARKNET/TON envelopes).
 */
export async function getRangoSend(
  asset: Asset,
  fromAddress: string,
  recipientAddress: string,
  amountHuman: string
): Promise<RangoSwapRate> {
  const base = defaultRangoSlippagePercent()
  const attempts: GetRangoSwapOptions[] = [
    { slippagePercent: base, disableEstimate: false },
    { slippagePercent: base, disableEstimate: true },
    { slippagePercent: Math.max(base, 5), disableEstimate: true },
    { slippagePercent: 15, disableEstimate: true },
  ]

  let lastError: Error | undefined
  const input = {
    address: fromAddress,
    recipientAddress,
    buyAsset: asset,
    sellAsset: asset,
    sellAmountCryptoPrecision: amountHuman,
  }

  for (const opts of attempts) {
    try {
      return await getRangoSwap(input, opts)
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e))
    }
  }

  throw lastError ?? new Error('Rango: no route for send')
}
