import { NETWORKS } from '@sola-ai/types'
import { AssetService } from '@sola-ai/utils'
import { z } from 'zod'

import { getAssetPrices as getAssetPricesLib } from '../lib/asset/prices'
import type { AssetWithPrice } from '../lib/asset/prices'

export const getAssetPricesSchema = z.object({
  assets: z
    .array(
      z.object({
        assetId: z.string().optional().describe('CAIP-19 assetId (e.g., "eip155:1/erc20:0xa0b8...")'),
        searchTerm: z.string().optional().describe('Search by symbol or name (e.g., "ETH", "USDC", "Bitcoin")'),
        network: z.enum(NETWORKS).optional().describe('Network to search on (e.g., "ethereum", "arbitrum")'),
      })
    )
    .min(1)
    .describe('Array of assets to get prices for. Provide either assetId OR searchTerm (+ optional network)'),
})

export type GetAssetPricesInput = z.infer<typeof getAssetPricesSchema>

export type GetAssetPricesOutput = {
  prices: Array<{
    assetId: string
    symbol: string
    name: string
    price: string
    priceChange24h?: number
  }>
}

export async function executeGetAssetPrices(input: GetAssetPricesInput): Promise<GetAssetPricesOutput> {
  const assetIds: string[] = []

  for (const assetInput of input.assets) {
    if (assetInput.assetId) {
      assetIds.push(assetInput.assetId)
    } else if (assetInput.searchTerm) {
      const result = AssetService.getInstance().searchWithFilters(assetInput.searchTerm, {
        network: assetInput.network,
      })[0]
      if (!result) {
        throw new Error(
          `Asset not found: ${assetInput.searchTerm}${assetInput.network ? ` on ${assetInput.network}` : ''}`
        )
      }
      assetIds.push(result.assetId)
    } else {
      throw new Error('Each asset must have either assetId or searchTerm')
    }
  }

  const assets: AssetWithPrice[] = await getAssetPricesLib(assetIds)

  return {
    prices: assets.map(asset => ({
      assetId: asset.assetId,
      symbol: asset.symbol,
      name: asset.name,
      price: asset.price,
      priceChange24h: asset.priceChange24h,
    })),
  }
}

export const getAssetPricesTool = {
  description: `Quick spot price lookups without UI cards. Returns price and 24h change only. Accepts asset symbols/names or assetIds.

Do NOT use for swap quotes, routes, aggregators, or questions like "how much would I get if I swap X to Y" — those require initiateSwap (shows live Rango routes in the UI).

Examples:
- { assets: [{ searchTerm: "LINK", network: "ethereum" }] }
- { assets: [{ searchTerm: "LINK" }, { searchTerm: "ZKP" }] }
- { assets: [{ assetId: "eip155:1/erc20:0x..." }] }`,
  inputSchema: getAssetPricesSchema,
  execute: executeGetAssetPrices,
}
