import { toBigInt } from '@sola-ai/utils'

import type { ActiveOrderSummary, WalletContext } from './walletContextSimple'

function filterEligibleOrders(orders: ActiveOrderSummary[]): ActiveOrderSummary[] {
  const nowSeconds = Math.floor(Date.now() / 1000)
  return orders.filter(o => o.status === 'open' && !(o.validTo > 0 && o.validTo < nowSeconds))
}

export function getCommittedAmountForToken(
  walletContext: WalletContext | undefined,
  _safeAddress: string,
  evmChainId: number,
  tokenAddress: string
): bigint {
  const chainOrders = (walletContext?.registryOrders ?? []).filter(
    o => o.chainId === evmChainId && o.sellTokenAddress.toLowerCase() === tokenAddress.toLowerCase()
  )
  const active = filterEligibleOrders(chainOrders)
  return active.reduce((sum, o) => sum + toBigInt(o.sellAmountBaseUnit), 0n)
}

export function getAllCommittedAmounts(
  walletContext: WalletContext | undefined,
  _safeAddress: string,
  evmChainId: number
): Map<string, bigint> {
  const chainOrders = (walletContext?.registryOrders ?? []).filter(o => o.chainId === evmChainId)
  const active = filterEligibleOrders(chainOrders)

  const committed = new Map<string, bigint>()
  for (const o of active) {
    const key = o.sellTokenAddress.toLowerCase()
    committed.set(key, (committed.get(key) ?? 0n) + toBigInt(o.sellAmountBaseUnit))
  }
  return committed
}
