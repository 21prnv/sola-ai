import { initializeCoinGeckoAdapters } from '@sola-ai/caip'
import { AssetService, initializeRelatedAssetIndex } from '@sola-ai/utils'

export async function initializeAllAssetData(): Promise<void> {
  await Promise.all([AssetService.initialize(), initializeCoinGeckoAdapters(), initializeRelatedAssetIndex()])
}

export async function refreshAllAssetData(): Promise<void> {
  await Promise.all([AssetService.refresh(), initializeCoinGeckoAdapters(), initializeRelatedAssetIndex()])
}
