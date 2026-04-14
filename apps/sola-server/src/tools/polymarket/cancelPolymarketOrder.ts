import { getAddress } from 'viem'
import { z } from 'zod'

import { getAddressForChain } from '../../utils/walletContextSimple'
import type { WalletContext } from '../../utils/walletContextSimple'

import { POLYGON_CAIP_CHAIN_ID } from './constants'

export const cancelPolymarketOrderSchema = z.object({
  orderId: z.string().optional().describe('Specific CLOB order id to cancel'),
  orderIds: z.array(z.string()).optional().describe('Multiple order ids to cancel in one call'),
  cancelAll: z.boolean().optional().describe('Cancel every open order for the maker wallet'),
})

export type CancelPolymarketOrderInput = z.infer<typeof cancelPolymarketOrderSchema>

export type CancelPolymarketOrderOutput = {
  owner: string
  orderId?: string
  orderIds?: string[]
  cancelAll: boolean
  summary: string
}

export async function executeCancelPolymarketOrder(
  input: CancelPolymarketOrderInput,
  walletContext?: WalletContext
): Promise<CancelPolymarketOrderOutput> {
  if (!input.orderId && !input.orderIds?.length && !input.cancelAll) {
    throw new Error('Provide orderId, orderIds, or cancelAll=true')
  }
  const owner = getAddress(getAddressForChain(walletContext, POLYGON_CAIP_CHAIN_ID))
  const cancelAll = !!input.cancelAll

  const summary = cancelAll
    ? 'Cancel all open orders'
    : input.orderIds?.length
      ? `Cancel ${input.orderIds.length} orders`
      : `Cancel order ${input.orderId}`

  return {
    owner,
    orderId: input.orderId,
    orderIds: input.orderIds,
    cancelAll,
    summary,
  }
}

export const cancelPolymarketOrderTool = {
  description: `Cancel one, many, or all active Polymarket CLOB orders.

Returns a prepared cancel request. The client UI card handles CLOB L2 authentication and actually sends the DELETE request.

Use:
- orderId for a single order
- orderIds for a batch
- cancelAll=true to cancel every open order for the wallet

UI CARD DISPLAYS: what was canceled.`,
  inputSchema: cancelPolymarketOrderSchema,
  execute: executeCancelPolymarketOrder,
}
