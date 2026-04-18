import { assetIdToCoingecko } from '@sola-ai/caip'
import { EVM_SOLANA_NETWORKS } from '@sola-ai/types'
import BigNumber from 'bignumber.js'
import { z } from 'zod'

import { getMarketChartRange } from '../lib/asset/coingecko/api'
import type { WalletContext } from '../utils/walletContextSimple'

import { getConnectedNetworks, getPortfolioData } from './portfolio'

const TIMEFRAME_SECONDS: Record<string, number> = {
  '24h': 86400,
  '7d': 604800,
  '30d': 2592000,
}

const MAX_ASSETS = 20

export const portfolioPnlSchema = z.object({
  timeframe: z.enum(['24h', '7d', '30d']).default('24h').describe('Timeframe for PnL calculation: 24h, 7d, or 30d'),
  networks: z
    .array(z.enum(EVM_SOLANA_NETWORKS))
    .optional()
    .describe('Optional networks to check. Defaults to all connected.'),
})

export type PortfolioPnlInput = z.infer<typeof portfolioPnlSchema>

export type AssetPnlEntry = {
  symbol: string
  name: string
  network: string
  cryptoAmount: string
  currentPrice: string
  historicalPrice: string
  currentValue: string
  historicalValue: string
  absoluteChange: string
  percentChange: string
}

export type PortfolioPnlOutput = {
  timeframe: string
  totalCurrentValue: string
  totalHistoricalValue: string
  absoluteChange: string
  percentChange: string
  assets: AssetPnlEntry[]
}

export async function executePortfolioPnl(
  input: PortfolioPnlInput,
  walletContext?: WalletContext
): Promise<PortfolioPnlOutput> {
  const timeframe = input.timeframe ?? '24h'
  const networks = input.networks ?? getConnectedNetworks(walletContext)

  if (networks.length === 0) {
    throw new Error('No networks specified and no connected wallets found.')
  }

  // Fetch current portfolio
  const portfolioData = await getPortfolioData({ networks }, walletContext)

  // Collect all balances, sort by USD value, take top N
  const allBalances = portfolioData.flatMap(nd =>
    nd.balances.map(b => ({
      ...b,
      network: nd.network,
    }))
  )

  const sorted = allBalances
    .filter(b => parseFloat(b.usdAmount) > 0.01)
    .sort((a, b) => parseFloat(b.usdAmount) - parseFloat(a.usdAmount))
    .slice(0, MAX_ASSETS)

  if (sorted.length === 0) {
    return {
      timeframe,
      totalCurrentValue: '0.00',
      totalHistoricalValue: '0.00',
      absoluteChange: '0.00',
      percentChange: '0.00',
      assets: [],
    }
  }

  // Fetch historical prices
  const nowUnix = Math.floor(Date.now() / 1000)
  const startUnix = nowUnix - (TIMEFRAME_SECONDS[timeframe] ?? TIMEFRAME_SECONDS['24h']!)

  const historicalPrices = await Promise.allSettled(
    sorted.map(async balance => {
      const coinGeckoId = assetIdToCoingecko(balance.asset.assetId)
      if (!coinGeckoId) return null

      const chartData = await getMarketChartRange(coinGeckoId, startUnix, nowUnix)
      if (!chartData.prices || chartData.prices.length === 0) return null

      // First price point is the historical price
      return { assetId: balance.asset.assetId, price: chartData.prices[0]![1] }
    })
  )

  const historicalPriceMap = new Map<string, number>()
  for (const result of historicalPrices) {
    if (result.status === 'fulfilled' && result.value) {
      historicalPriceMap.set(result.value.assetId, result.value.price)
    }
  }

  // Calculate PnL
  let totalCurrentValue = new BigNumber(0)
  let totalHistoricalValue = new BigNumber(0)
  const assets: AssetPnlEntry[] = []

  for (const balance of sorted) {
    const currentPrice = parseFloat(balance.asset.price)
    const historicalPrice = historicalPriceMap.get(balance.asset.assetId)

    if (historicalPrice === undefined || historicalPrice === 0) continue

    const cryptoAmount = new BigNumber(balance.cryptoAmount)
    const currentValue = cryptoAmount.times(currentPrice)
    const historicalValue = cryptoAmount.times(historicalPrice)
    const absoluteChange = currentValue.minus(historicalValue)
    const percentChange = historicalValue.gt(0) ? absoluteChange.div(historicalValue).times(100) : new BigNumber(0)

    totalCurrentValue = totalCurrentValue.plus(currentValue)
    totalHistoricalValue = totalHistoricalValue.plus(historicalValue)

    assets.push({
      symbol: balance.asset.symbol,
      name: balance.asset.name,
      network: balance.network,
      cryptoAmount: balance.cryptoAmount,
      currentPrice: currentPrice.toFixed(2),
      historicalPrice: historicalPrice.toFixed(2),
      currentValue: currentValue.toFixed(2),
      historicalValue: historicalValue.toFixed(2),
      absoluteChange: absoluteChange.toFixed(2),
      percentChange: percentChange.toFixed(2),
    })
  }

  const totalAbsolute = totalCurrentValue.minus(totalHistoricalValue)
  const totalPercent = totalHistoricalValue.gt(0)
    ? totalAbsolute.div(totalHistoricalValue).times(100)
    : new BigNumber(0)

  return {
    timeframe,
    totalCurrentValue: totalCurrentValue.toFixed(2),
    totalHistoricalValue: totalHistoricalValue.toFixed(2),
    absoluteChange: totalAbsolute.toFixed(2),
    percentChange: totalPercent.toFixed(2),
    assets,
  }
}

export const portfolioPnlTool = {
  description: `Calculate portfolio profit & loss over a timeframe (24h, 7d, 30d). Shows total PnL and per-asset breakdown.

UI CARD DISPLAYS: total PnL with gain/loss indicators, per-asset performance table.

Covers top holdings by USD value. Use this when users ask about gains, losses, performance, or "how's my portfolio doing."`,
  inputSchema: portfolioPnlSchema,
  execute: executePortfolioPnl,
}
