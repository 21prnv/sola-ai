import type { AssetId } from '@sola-ai/caip'
import type { ParsedTransaction } from '@sola-ai/types'
import { networkToNativeAssetId } from '@sola-ai/types'

import { getSimplePrices } from '../asset/coingecko/api'

export type PriceMap = Map<AssetId, number>

export async function fetchPricesForTransactions(
  transactions: ParsedTransaction[],
  networksChecked: string[]
): Promise<PriceMap> {
  const assetIds = new Set<AssetId>()

  for (const network of networksChecked) {
    const nativeAssetId = networkToNativeAssetId[network as keyof typeof networkToNativeAssetId]
    if (nativeAssetId) {
      assetIds.add(nativeAssetId)
    }
  }

  for (const tx of transactions) {
    if (tx.tokenTransfers) {
      for (const transfer of tx.tokenTransfers) {
        assetIds.add(transfer.assetId)
      }
    }
  }

  if (assetIds.size === 0) {
    return new Map()
  }

  const priceResults = await getSimplePrices(Array.from(assetIds))

  const priceMap = new Map<AssetId, number>()
  for (const result of priceResults) {
    if (result.price !== undefined) {
      const price = parseFloat(result.price)
      if (!isNaN(price) && price > 0) {
        priceMap.set(result.assetId, price)
      }
    }
  }

  return priceMap
}

export function getNativeAssetId(network: string): AssetId | undefined {
  return networkToNativeAssetId[network as keyof typeof networkToNativeAssetId]
}
