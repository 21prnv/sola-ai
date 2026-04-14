import { NETWORKS } from '@sola-ai/types'
import { AssetService } from '@sola-ai/utils'
import { z } from 'zod'

import { getAssetPrices as getAssetPricesLib } from '../lib/asset/prices'
import type { AssetWithPrice } from '../lib/asset/prices'

const assetEntrySchema = z.object({
  assetId: z.string().optional().describe('CAIP-19 assetId (e.g., "eip155:1/erc20:0xa0b8...")'),
  searchTerm: z.string().optional().describe('Search by symbol or name (e.g., "ETH", "USDC", "Bitcoin")'),
  network: z.enum(NETWORKS).optional().describe('Network to search on (e.g., "ethereum", "arbitrum")'),
})

export const getAssetPricesSchema = z.object({
  assets: z
    .array(assetEntrySchema)
    .min(1)
    .optional()
    .describe('Array of assets to get prices for. Provide either assetId OR searchTerm (+ optional network)'),
  // Flat fallback — models sometimes send { searchTerm: "ETH" } instead of { assets: [...] }
  assetId: z.string().optional().describe('Single assetId lookup (fallback if assets array is omitted)'),
  searchTerm: z.string().optional().describe('Single search term lookup (fallback if assets array is omitted)'),
  network: z.enum(NETWORKS).optional().describe('Network for single lookup'),
})

export type GetAssetPricesInput = z.infer<typeof getAssetPricesSchema>

type NormalizedEntry = z.infer<typeof assetEntrySchema>

function normalizeInput(input: GetAssetPricesInput): NormalizedEntry[] {
  if (input.assets && input.assets.length > 0) return input.assets
  if (input.searchTerm || input.assetId) {
    return [{ assetId: input.assetId, searchTerm: input.searchTerm, network: input.network }]
  }
  return []
}

export type GetAssetPricesOutput = {
  prices: Array<{
    assetId: string
    symbol: string
    name: string
    price: string
    priceChange24h?: number
    icon?: string
  }>
}

export async function executeGetAssetPrices(input: GetAssetPricesInput): Promise<GetAssetPricesOutput> {
  const entries = normalizeInput(input)

  if (entries.length === 0) {
    throw new Error('Provide at least one asset via the "assets" array or a flat "searchTerm"/"assetId"')
  }

  const assetIds: string[] = []

  for (const assetInput of entries) {
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
      icon: asset.icon,
    })),
  }
}

export const getAssetPricesTool = {
  description: `Quick spot price lookups with compact UI cards. Returns price and 24h change only. Accepts asset symbols/names or assetIds.

Do NOT use for swap quotes, routes, aggregators, or questions like "how much would I get if I swap X to Y" — those require initiateSwap (shows live Rango routes in the UI).

Examples:
- { assets: [{ searchTerm: "LINK", network: "ethereum" }] }
- { assets: [{ searchTerm: "LINK" }, { searchTerm: "ZKP" }] }
- { searchTerm: "ETH" }`,
  inputSchema: getAssetPricesSchema,
  execute: executeGetAssetPrices,
}
