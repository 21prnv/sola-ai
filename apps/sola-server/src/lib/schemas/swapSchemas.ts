import { asset } from '@sola-ai/types'
import z from 'zod'

// Base transaction schema that's reused across swap tools
export const transactionSchema = z.object({
  chainId: z.string(),
  data: z.string(),
  from: z.string(),
  to: z.string(),
  value: z.string(),
  gasLimit: z.string().optional(),
})

// Asset input schema for swap operations
export const assetInputSchema = z.object({
  symbolOrName: z.string().describe('Token symbol or name (e.g., "ETH", "USDC", "SOL")'),
  network: z
    .enum(['ethereum', 'optimism', 'arbitrum', 'polygon', 'avalanche', 'bsc', 'base', 'gnosis', 'solana'])
    .optional()
    .describe('Network for this asset. If not specified, will search across all networks.'),
})

// Comprehensive swap data schema
export const swapDataSchema = z.object({
  sellAmountCryptoPrecision: z.string(),
  buyAmountCryptoPrecision: z.string(),
  sellAmountUsd: z.string().optional(),
  buyAmountUsd: z.string().optional(),
  approvalTarget: z.string(),
  sellAsset: asset,
  buyAsset: asset,
  sellAccount: z.string(),
  buyAccount: z.string(),
})

export const swapQuoteOptionSchema = z.object({
  swapperId: z.string(),
  swapperTitle: z.string(),
  swapperLogo: z.string().optional(),
  outputAmount: z.string(),
  outputAmountMin: z.string(),
  outputAmountUsd: z.number().nullable(),
  feeUsd: z.number().nullable(),
  estimatedTimeSeconds: z.number(),
  pathStepCount: z.number(),
  resultType: z.string(),
})

export const swapRouteBuildContextSchema = z.object({
  sellAsset: asset,
  buyAsset: asset,
  sellAssetInput: assetInputSchema,
  buyAssetInput: assetInputSchema,
  sellAmountCrypto: z.string(),
  sellAccount: z.string(),
  buyAccount: z.string(),
  slippagePercent: z.number().optional(),
})

// Summary schema for user-facing swap information
export const swapSummarySchema = z.object({
  sellAsset: z.object({
    symbol: z.string(),
    amount: z.string(),
    network: z.string(),
    chainName: z.string(),
    valueUSD: z.string().nullable(),
    priceUSD: z.string().nullable(),
  }),
  buyAsset: z.object({
    symbol: z.string(),
    estimatedAmount: z.string(),
    network: z.string(),
    chainName: z.string(),
    estimatedValueUSD: z.string().nullable(),
    priceUSD: z.string().nullable(),
  }),
  exchange: z.object({
    provider: z.string(),
    rate: z.string(),
    priceImpact: z.string().nullable().optional(),
    networkFeeCrypto: z.string().optional(),
    networkFeeSymbol: z.string().optional(),
    networkFeeUsd: z.string().optional(),
  }),
  isCrossChain: z.boolean(),
})

// Core swap preparation output schema
export const swapPreparationSchema = z.object({
  summary: swapSummarySchema,
  needsApproval: z.boolean().optional(),
  approvalTx: transactionSchema.optional(),
  swapTx: transactionSchema.optional(),
  swapData: swapDataSchema.optional(),
  /** When true, user must pick a Rango route in the UI; `swapTx` is built after POST /api/swap/build. */
  awaitingRouteSelection: z.boolean().optional(),
  quoteOptions: z.array(swapQuoteOptionSchema).optional(),
  routeBuildContext: swapRouteBuildContextSchema.optional(),
})

// Export type definitions
export type TransactionData = z.infer<typeof transactionSchema>
export type AssetInput = z.infer<typeof assetInputSchema>
export type SwapData = z.infer<typeof swapDataSchema>
export type SwapSummary = z.infer<typeof swapSummarySchema>
export type SwapPreparation = z.infer<typeof swapPreparationSchema>
export type SwapQuoteOption = z.infer<typeof swapQuoteOptionSchema>
export type SwapRouteBuildContext = z.infer<typeof swapRouteBuildContextSchema>
