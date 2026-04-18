import { z } from 'zod'

import { getAddressForChain } from '../../utils/walletContextSimple'
import type { WalletContext } from '../../utils/walletContextSimple'

import { POLYGON_CAIP_CHAIN_ID } from './constants'

const DATA_API_BASE = 'https://data-api.polymarket.com'

export const getPolymarketPositionsSchema = z.object({
  address: z.string().optional().describe('Wallet address to query. Defaults to the connected Polygon wallet.'),
  sizeThreshold: z.number().optional().describe('Ignore positions smaller than this share count (default: 1)'),
  limit: z.number().int().min(1).max(100).optional().describe('Max positions to return (default: 50)'),
})

export type GetPolymarketPositionsInput = z.infer<typeof getPolymarketPositionsSchema>

export type PolymarketPosition = {
  title: string
  outcome: string
  conditionId: string
  tokenId: string
  size: number
  avgPrice: number
  currentPrice: number
  initialValue: number
  currentValue: number
  cashPnl: number
  percentPnl: number
  realizedPnl: number
  slug?: string
  icon?: string
  endDate?: string
}

export type GetPolymarketPositionsOutput = {
  address: string
  positions: PolymarketPosition[]
  totals: {
    initialValue: number
    currentValue: number
    cashPnl: number
    realizedPnl: number
  }
}

type RawPosition = {
  title?: string
  outcome?: string
  conditionId?: string
  asset?: string
  size?: number | string
  avgPrice?: number | string
  curPrice?: number | string
  initialValue?: number | string
  currentValue?: number | string
  cashPnl?: number | string
  percentPnl?: number | string
  realizedPnl?: number | string
  slug?: string
  icon?: string
  endDate?: string
}

function num(x: number | string | undefined): number {
  if (x === undefined || x === null) return 0
  const n = typeof x === 'number' ? x : Number(x)
  return Number.isFinite(n) ? n : 0
}

export async function executeGetPolymarketPositions(
  input: GetPolymarketPositionsInput,
  walletContext?: WalletContext
): Promise<GetPolymarketPositionsOutput> {
  const address = input.address ?? getAddressForChain(walletContext, POLYGON_CAIP_CHAIN_ID)
  const sizeThreshold = input.sizeThreshold ?? 1
  const limit = input.limit ?? 50

  const params = new URLSearchParams()
  params.set('user', address.toLowerCase())
  params.set('sizeThreshold', String(sizeThreshold))
  params.set('limit', String(limit))

  const res = await fetch(`${DATA_API_BASE}/positions?${params.toString()}`, {
    headers: { accept: 'application/json' },
  })
  if (!res.ok) {
    throw new Error(`Polymarket data-api error: ${res.status} ${res.statusText}`)
  }
  const raw = (await res.json()) as RawPosition[]

  const positions: PolymarketPosition[] = (Array.isArray(raw) ? raw : []).map(p => ({
    title: p.title ?? '',
    outcome: p.outcome ?? '',
    conditionId: p.conditionId ?? '',
    tokenId: p.asset ?? '',
    size: num(p.size),
    avgPrice: num(p.avgPrice),
    currentPrice: num(p.curPrice),
    initialValue: num(p.initialValue),
    currentValue: num(p.currentValue),
    cashPnl: num(p.cashPnl),
    percentPnl: num(p.percentPnl),
    realizedPnl: num(p.realizedPnl),
    slug: p.slug,
    icon: p.icon,
    endDate: p.endDate,
  }))

  const totals = positions.reduce(
    (acc, p) => ({
      initialValue: acc.initialValue + p.initialValue,
      currentValue: acc.currentValue + p.currentValue,
      cashPnl: acc.cashPnl + p.cashPnl,
      realizedPnl: acc.realizedPnl + p.realizedPnl,
    }),
    { initialValue: 0, currentValue: 0, cashPnl: 0, realizedPnl: 0 }
  )

  return { address, positions, totals }
}

export const getPolymarketPositionsTool = {
  description: `List current Polymarket positions with unrealized + realized P&L for a wallet.

Uses the public Polymarket data API — no CLOB credentials required. Defaults to the connected Polygon wallet.

UI CARD DISPLAYS: each position (market + outcome), size, avg cost, current price, P&L, and overall totals.`,
  inputSchema: getPolymarketPositionsSchema,
  execute: executeGetPolymarketPositions,
}
