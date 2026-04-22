import { fetchWithTimeout } from '@sola-ai/utils'
import { z } from 'zod'

const CLOB_BASE_URL = 'https://clob.polymarket.com'

export const getPolymarketPriceSchema = z.object({
  tokenId: z.string().describe('CLOB outcome token id (from searchPolymarketMarkets → outcomes[i].tokenId)'),
  depth: z.number().min(1).max(10).optional().describe('Top-of-book levels to return per side (default: 3)'),
})

export type GetPolymarketPriceInput = z.infer<typeof getPolymarketPriceSchema>

export type OrderbookLevel = {
  price: number
  size: number
}

export type GetPolymarketPriceOutput = {
  tokenId: string
  bestBid: number | null
  bestAsk: number | null
  midPrice: number | null
  spread: number | null
  bids: OrderbookLevel[]
  asks: OrderbookLevel[]
}

type RawClobLevel = { price: string; size: string }
type RawClobBook = {
  asset_id?: string
  bids?: RawClobLevel[]
  asks?: RawClobLevel[]
}

function parseLevels(raw: RawClobLevel[] | undefined, desc: boolean, depth: number): OrderbookLevel[] {
  if (!Array.isArray(raw)) return []
  const levels = raw
    .map(l => ({ price: Number(l.price), size: Number(l.size) }))
    .filter(l => Number.isFinite(l.price) && Number.isFinite(l.size) && l.size > 0)
  levels.sort((a, b) => (desc ? b.price - a.price : a.price - b.price))
  return levels.slice(0, depth)
}

export async function executeGetPolymarketPrice(input: GetPolymarketPriceInput): Promise<GetPolymarketPriceOutput> {
  const depth = input.depth ?? 3

  const url = `${CLOB_BASE_URL}/book?token_id=${encodeURIComponent(input.tokenId)}`
  const res = await fetchWithTimeout(url, { headers: { accept: 'application/json' } })
  if (!res.ok) {
    throw new Error(`Polymarket CLOB API error: ${res.status} ${res.statusText}`)
  }
  const data = (await res.json()) as RawClobBook

  const bids = parseLevels(data.bids, true, depth)
  const asks = parseLevels(data.asks, false, depth)

  const bestBid = bids[0]?.price ?? null
  const bestAsk = asks[0]?.price ?? null
  const midPrice = bestBid !== null && bestAsk !== null ? (bestBid + bestAsk) / 2 : null
  const spread = bestBid !== null && bestAsk !== null ? bestAsk - bestBid : null

  return {
    tokenId: input.tokenId,
    bestBid,
    bestAsk,
    midPrice,
    spread,
    bids,
    asks,
  }
}

export const getPolymarketPriceTool = {
  description: `Get the current Polymarket orderbook and derived mid price for a specific outcome token (e.g. the "Yes" or "No" side of a prediction market).

Call searchPolymarketMarkets first to resolve a market and obtain the tokenId, then use this tool for live pricing.

UI CARD DISPLAYS: best bid, best ask, mid price, spread, and top orderbook levels.`,
  inputSchema: getPolymarketPriceSchema,
  execute: executeGetPolymarketPrice,
}
