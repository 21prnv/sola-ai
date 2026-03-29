import type { AssetId, ChainId } from '@sola-ai/caip'
import { toAssetId } from '@sola-ai/caip'
import type { KnownChainIds } from '@sola-ai/types'
import { getAssetNamespaceFromChainId } from '@sola-ai/utils'

export function createAssetId(chainId: ChainId, assetReference: string, shouldNormalize: boolean = false): AssetId {
  const assetNamespace = getAssetNamespaceFromChainId(chainId as KnownChainIds)
  const normalizedReference = shouldNormalize ? assetReference.toLowerCase() : assetReference

  return toAssetId({ chainId, assetNamespace, assetReference: normalizedReference })
}
