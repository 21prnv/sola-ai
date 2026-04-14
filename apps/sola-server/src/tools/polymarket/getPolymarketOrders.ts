import { getAddress } from 'viem'
import { z } from 'zod'

import { getAddressForChain } from '../../utils/walletContextSimple'
import type { WalletContext } from '../../utils/walletContextSimple'

import { POLYGON_CAIP_CHAIN_ID } from './constants'

export const getPolymarketOrdersSchema = z.object({
  market: z.string().optional().describe('Optional market conditionId filter'),
  tokenId: z.string().optional().describe('Optional outcome token id filter'),
})

export type GetPolymarketOrdersInput = z.infer<typeof getPolymarketOrdersSchema>

export type PolymarketOpenOrder = {
  id: string
  market: string
  assetId: string
  side: 'BUY' | 'SELL'
  price: number
  originalSize: number
  sizeMatched: number
  remainingSize: number
  status: string
  createdAt?: string
  expiration?: string
}

export type GetPolymarketOrdersOutput = {
  owner: string
  market?: string
  tokenId?: string
}

export async function executeGetPolymarketOrders(
  input: GetPolymarketOrdersInput,
  walletContext?: WalletContext
): Promise<GetPolymarketOrdersOutput> {
  const owner = getAddress(getAddressForChain(walletContext, POLYGON_CAIP_CHAIN_ID))
  return { owner, market: input.market, tokenId: input.tokenId }
}

export const getPolymarketOrdersTool = {
  description: `List active Polymarket CLOB orders for the connected wallet.

Returns a prepared query. The client UI card handles CLOB L2 authentication and fetches the actual order list.

UI CARD DISPLAYS: side, price, size, filled, and remaining for each open order.`,
  inputSchema: getPolymarketOrdersSchema,
  execute: executeGetPolymarketOrders,
}
