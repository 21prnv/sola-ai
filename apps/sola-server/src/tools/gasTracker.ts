import {
  arbitrumChainId,
  avalancheChainId,
  baseChainId,
  bscChainId,
  ethChainId,
  gnosisChainId,
  optimismChainId,
  polygonChainId,
} from '@sola-ai/caip'
import type { ChainId } from '@sola-ai/caip'
import { chainIdToNetwork } from '@sola-ai/types'
import { getFeeAssetIdByChainId, getViemClient } from '@sola-ai/utils'
import { formatGwei } from 'viem'
import { z } from 'zod'

import { getSimplePrices } from '../lib/asset/coingecko/api'

const EVM_CHAIN_IDS: ChainId[] = [
  ethChainId,
  arbitrumChainId,
  optimismChainId,
  baseChainId,
  polygonChainId,
  avalancheChainId,
  bscChainId,
  gnosisChainId,
]

const ETH_TRANSFER_GAS = 21000n

const GAS_THRESHOLDS: Record<string, { low: number; high: number }> = {
  ethereum: { low: 15, high: 50 },
  arbitrum: { low: 0.1, high: 1 },
  optimism: { low: 0.05, high: 0.5 },
  base: { low: 0.05, high: 0.5 },
  polygon: { low: 30, high: 100 },
  avalanche: { low: 25, high: 75 },
  bsc: { low: 1, high: 5 },
  gnosis: { low: 1, high: 5 },
}

export const gasTrackerSchema = z.object({
  networks: z
    .array(z.string())
    .optional()
    .describe('Optional list of networks to check (e.g. ["ethereum", "arbitrum"]). Defaults to all EVM chains.'),
})

export type GasTrackerInput = z.infer<typeof gasTrackerSchema>

export type GasChainEntry = {
  network: string
  gasPriceGwei: string
  baseFeeGwei?: string
  priorityFeeGwei?: string
  estimatedTransferCostUsd: string
  level: 'low' | 'medium' | 'high'
}

export type GasTrackerOutput = {
  chains: GasChainEntry[]
}

function classifyGasLevel(network: string, gasPriceGwei: number): 'low' | 'medium' | 'high' {
  const thresholds = GAS_THRESHOLDS[network] ?? { low: 10, high: 50 }
  if (gasPriceGwei <= thresholds.low) return 'low'
  if (gasPriceGwei >= thresholds.high) return 'high'
  return 'medium'
}

export async function executeGasTracker(input: GasTrackerInput): Promise<GasTrackerOutput> {
  const networkFilter = input.networks?.map(n => n.toLowerCase())

  const chainIds = networkFilter
    ? EVM_CHAIN_IDS.filter(id => {
        const network = chainIdToNetwork[id]
        return network && networkFilter.includes(network)
      })
    : EVM_CHAIN_IDS

  if (chainIds.length === 0) {
    throw new Error('No valid EVM networks specified.')
  }

  const feeAssetIds = chainIds.map(id => getFeeAssetIdByChainId(id)).filter((id): id is string => !!id)
  const pricesPromise = getSimplePrices(feeAssetIds)

  const gasResults = await Promise.allSettled(
    chainIds.map(async chainId => {
      const client = getViemClient(chainId)
      const network = chainIdToNetwork[chainId] ?? chainId

      const gasPrice = await client.getGasPrice()
      const gasPriceGwei = parseFloat(formatGwei(gasPrice))

      let baseFeeGwei: string | undefined
      let priorityFeeGwei: string | undefined

      try {
        const fees = await client.estimateFeesPerGas()
        if (fees.maxFeePerGas) baseFeeGwei = formatGwei(fees.maxFeePerGas)
        if (fees.maxPriorityFeePerGas) priorityFeeGwei = formatGwei(fees.maxPriorityFeePerGas)
      } catch {
        // Not all chains support EIP-1559
      }

      return {
        chainId,
        network,
        gasPrice,
        gasPriceGwei,
        baseFeeGwei,
        priorityFeeGwei,
      }
    })
  )

  const prices = await pricesPromise
  const priceMap = new Map(prices.map(p => [p.assetId, parseFloat(p.price)]))

  const chains: GasChainEntry[] = []

  for (let i = 0; i < chainIds.length; i++) {
    const result = gasResults[i]
    if (result?.status !== 'fulfilled') continue

    const { chainId, network, gasPrice, gasPriceGwei, baseFeeGwei, priorityFeeGwei } = result.value
    const feeAssetId = getFeeAssetIdByChainId(chainId)
    const nativePrice = feeAssetId ? (priceMap.get(feeAssetId) ?? 0) : 0

    const transferCostWei = gasPrice * ETH_TRANSFER_GAS
    const transferCostEth = Number(transferCostWei) / 1e18
    const transferCostUsd = (transferCostEth * nativePrice).toFixed(4)

    chains.push({
      network,
      gasPriceGwei: gasPriceGwei.toFixed(4),
      baseFeeGwei,
      priorityFeeGwei,
      estimatedTransferCostUsd: transferCostUsd,
      level: classifyGasLevel(network, gasPriceGwei),
    })
  }

  return { chains }
}

export const gasTrackerTool = {
  description: `Get current gas prices across EVM chains with USD cost estimates.

UI CARD DISPLAYS: per-chain gas prices in gwei, estimated transfer costs in USD, and gas level indicators (low/medium/high).

Examples:
- { } — all EVM chains
- { networks: ["ethereum", "arbitrum", "base"] } — specific chains only`,
  inputSchema: gasTrackerSchema,
  execute: executeGasTracker,
}
