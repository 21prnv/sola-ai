import { fetchWithTimeout } from '@sola-ai/utils'
import { z } from 'zod'

const GAMMA_BASE_URL = 'https://gamma-api.polymarket.com'

export const searchPolymarketMarketsSchema = z.object({
  query: z.string().optional().describe('Keyword to search market questions/slugs'),
  slug: z.string().optional().describe('Exact market slug'),
  conditionId: z.string().optional().describe('Exact condition id (0x...)'),
  limit: z.number().min(1).max(20).optional().describe('Number of markets to return (default: 5, max: 20)'),
  activeOnly: z.boolean().optional().describe('Only return active, non-closed markets (default: true)'),
})

export type SearchPolymarketMarketsInput = z.infer<typeof searchPolymarketMarketsSchema>

export type PolymarketOutcome = {
  label: string
  tokenId: string
}

export type PolymarketMarket = {
  id: string
  slug: string
  question: string
  description?: string
  endDate?: string
  active: boolean
  closed: boolean
  volume?: number
  liquidity?: number
  outcomes: PolymarketOutcome[]
  conditionId?: string
  image?: string
}

export type SearchPolymarketMarketsOutput = {
  markets: PolymarketMarket[]
}

type RawGammaMarket = {
  id?: string | number
  slug?: string
  question?: string
  description?: string
  endDate?: string
  active?: boolean
  closed?: boolean
  volume?: string | number
  liquidity?: string | number
  outcomes?: string | string[]
  clobTokenIds?: string | string[]
  conditionId?: string
  image?: string
}

function parseJsonArrayField(value: string | string[] | undefined): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

function normalizeMarket(raw: RawGammaMarket): PolymarketMarket {
  const outcomeLabels = parseJsonArrayField(raw.outcomes)
  const tokenIds = parseJsonArrayField(raw.clobTokenIds)
  const outcomes: PolymarketOutcome[] = outcomeLabels.map((label, i) => ({
    label,
    tokenId: tokenIds[i] ?? '',
  }))

  return {
    id: String(raw.id ?? ''),
    slug: raw.slug ?? '',
    question: raw.question ?? '',
    description: raw.description,
    endDate: raw.endDate,
    active: raw.active ?? false,
    closed: raw.closed ?? false,
    volume: raw.volume !== undefined ? Number(raw.volume) : undefined,
    liquidity: raw.liquidity !== undefined ? Number(raw.liquidity) : undefined,
    outcomes,
    conditionId: raw.conditionId,
    image: raw.image,
  }
}

export async function executeSearchPolymarketMarkets(
  input: SearchPolymarketMarketsInput
): Promise<SearchPolymarketMarketsOutput> {
  const limit = input.limit ?? 5
  const activeOnly = input.activeOnly ?? true

  const params = new URLSearchParams()
  params.set('limit', String(limit))
  if (activeOnly) {
    params.set('active', 'true')
    params.set('closed', 'false')
  }
  if (input.slug) params.set('slug', input.slug)
  if (input.conditionId) params.set('condition_ids', input.conditionId)
  if (input.query) params.set('search', input.query)

  const url = `${GAMMA_BASE_URL}/markets?${params.toString()}`
  const res = await fetchWithTimeout(url, { headers: { accept: 'application/json' } })
  if (!res.ok) {
    throw new Error(`Polymarket Gamma API error: ${res.status} ${res.statusText}`)
  }
  const data = (await res.json()) as RawGammaMarket[] | { markets?: RawGammaMarket[] }
  const rawList = Array.isArray(data) ? data : (data.markets ?? [])
  const markets = rawList.slice(0, limit).map(normalizeMarket)

  return { markets }
}

export const searchPolymarketMarketsTool = {
  description: `Search or resolve Polymarket prediction markets via the Gamma API.

Use this to:
- Find prediction markets by keyword (e.g. "bitcoin 120k", "election")
- Resolve a specific market by slug or conditionId
- Get outcome tokens (Yes/No) and their CLOB token ids for pricing

UI CARD DISPLAYS: market question, outcomes, end date, volume, and liquidity.`,
  inputSchema: searchPolymarketMarketsSchema,
  execute: executeSearchPolymarketMarkets,
}
