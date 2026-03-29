import type { AssetId } from '@sola-ai/caip'
import type { Asset } from '@sola-ai/types'
import { chainIdToNetwork } from '@sola-ai/types'
import { AssetService } from '@sola-ai/utils'

import { getSimplePrices } from './coingecko'

export type AssetWithPrice = Asset & {
  priceChange24h?: number
}

export async function getAssetPrices(assetIds: AssetId[]): Promise<AssetWithPrice[]> {
  if (assetIds.length === 0) return []

  const staticAssets = assetIds
    .map(id => AssetService.getInstance().getAsset(id))
    .filter((a): a is NonNullable<typeof a> => a !== undefined)

  if (staticAssets.length === 0) return []

  const prices = await getSimplePrices(assetIds)
  const priceMap = new Map(prices.map(p => [p.assetId, { price: p.price, priceChange24h: p.priceChange24h }]))

  return staticAssets.map(staticAsset => {
    const priceData = priceMap.get(staticAsset.assetId)
    return {
      ...staticAsset,
      price: priceData?.price ?? '0',
      priceChange24h: priceData?.priceChange24h,
      network: chainIdToNetwork[staticAsset.chainId] ?? '',
    }
  })
}
