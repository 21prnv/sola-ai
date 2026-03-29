import { assetIdToCoingecko } from '@sola-ai/caip'
import type { Network } from '@sola-ai/types'
import { AssetService } from '@sola-ai/utils'

export function searchAsset(searchTerm: string, filters: { network?: Network }) {
  return AssetService.getInstance().searchWithFilters(searchTerm, filters)[0] as { assetId: string } | undefined
}

export function getAssetMeta(assetId: string) {
  return AssetService.getInstance().getAsset(assetId) as { symbol: string; name: string } | undefined
}

export { assetIdToCoingecko }
