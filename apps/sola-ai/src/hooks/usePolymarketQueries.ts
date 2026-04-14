import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { cancelOrders, fetchOpenOrders, loadPolymarketCreds } from '@/lib/polymarketAuth'
import type { ClobOpenOrder, PolymarketCreds } from '@/lib/polymarketAuth'

const DATA_API_BASE = 'https://data-api.polymarket.com'

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

async function fetchPositions(address: string): Promise<PolymarketPosition[]> {
  const params = new URLSearchParams()
  params.set('user', address.toLowerCase())
  params.set('sizeThreshold', '1')
  params.set('limit', '100')

  const res = await fetch(`${DATA_API_BASE}/positions?${params.toString()}`, {
    headers: { accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`Positions error: ${res.status}`)
  const raw = (await res.json()) as RawPosition[]

  return (Array.isArray(raw) ? raw : []).map((p) => ({
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
}

export function usePolymarketPositions(address: string | undefined) {
  return useQuery({
    queryKey: ['polymarket', 'positions', address?.toLowerCase()],
    queryFn: () => fetchPositions(address!),
    enabled: !!address,
    refetchInterval: 15_000,
    staleTime: 10_000,
    placeholderData: keepPreviousData,
  })
}

export function usePolymarketOpenOrders(address: string | undefined): {
  creds: PolymarketCreds | null
  data: ClobOpenOrder[] | undefined
  isLoading: boolean
  isError: boolean
  error: unknown
  refetch: () => void
} {
  const creds = address ? loadPolymarketCreds(address) : null
  const q = useQuery({
    queryKey: ['polymarket', 'orders', address?.toLowerCase()],
    queryFn: () => fetchOpenOrders({ creds: creds!, address: address! }),
    enabled: !!address && !!creds,
    refetchInterval: 15_000,
    staleTime: 10_000,
    placeholderData: keepPreviousData,
  })
  return {
    creds,
    data: q.data,
    isLoading: q.isLoading,
    isError: q.isError,
    error: q.error,
    refetch: () => void q.refetch(),
  }
}

export async function cancelOrderAndInvalidate(params: {
  creds: PolymarketCreds
  address: string
  orderId: string
}): Promise<void> {
  await cancelOrders({ creds: params.creds, address: params.address, orderId: params.orderId })
}
