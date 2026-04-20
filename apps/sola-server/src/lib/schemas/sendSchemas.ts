import { asset } from '@sola-ai/types'
import * as z from 'zod'

import { assetInputSchema, transactionSchema } from './swapSchemas'

export const sendSchema = z.object({
  asset: assetInputSchema.describe('Asset to send (e.g., ETH, USDC, SOL)'),
  recipient: z.string().describe('Recipient wallet address'),
  amount: z.string().describe('Amount in crypto tokens, or "max" for maximum balance'),
})

export const sendSummarySchema = z.object({
  asset: z.string(),
  symbol: z.string(),
  amount: z.string(),
  from: z.string(),
  to: z.string(),
  network: z.string(),
  chainName: z.string(),
  estimatedFeeCrypto: z.string(),
  estimatedFeeSymbol: z.string(),
  estimatedFeeUsd: z.string().nullable().optional(),
  ataCreation: z.boolean().optional(), // Solana-specific
})

export const sendDataSchema = z.object({
  assetId: z.string(),
  from: z.string(),
  to: z.string(),
  amount: z.string(),
  chainId: z.string(),
  asset: asset,
})

export const sendOutputSchema = z.object({
  summary: sendSummarySchema,
  tx: transactionSchema,
  sendData: sendDataSchema,
})

export type SendInput = z.infer<typeof sendSchema>
export type SendSummary = z.infer<typeof sendSummarySchema>
export type SendData = z.infer<typeof sendDataSchema>
export type SendOutput = z.infer<typeof sendOutputSchema>
