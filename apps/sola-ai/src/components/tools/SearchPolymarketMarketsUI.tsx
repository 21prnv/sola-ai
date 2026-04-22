import { TrendingUp } from 'lucide-react'

import { SafeImage } from '../ui/SafeImage'
import { ToolCard } from '../ui/ToolCard'

import { useToolStateRender } from './toolUIHelpers'
import type { ToolUIComponentProps } from './toolUIHelpers'

function formatVolume(value: number | undefined): string {
  if (value === undefined || value === null) return '—'
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return `$${value.toFixed(0)}`
}

export function SearchPolymarketMarketsUI({ toolPart }: ToolUIComponentProps<'searchPolymarketMarketsTool'>) {
  const { state, output } = toolPart

  const stateRender = useToolStateRender(state, {
    loading: 'Searching Polymarket…',
    error: 'Failed to fetch Polymarket markets',
  })
  if (stateRender) return stateRender

  const markets = output?.markets ?? []
  if (markets.length === 0) return null

  return (
    <ToolCard.Root defaultOpen>
      <ToolCard.Header>
        <ToolCard.HeaderRow>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-500" />
            <span className="font-medium">Polymarket Prediction Markets</span>
          </div>
        </ToolCard.HeaderRow>
      </ToolCard.Header>
      <ToolCard.Content>
        <ToolCard.Details>
          <div className="divide-y divide-border">
            {markets.map(m => (
              <div key={m.id || m.slug} className="py-3 px-1">
                <div className="flex items-start gap-3">
                  <SafeImage
                    src={m.image}
                    alt=""
                    className="w-10 h-10 rounded shrink-0 object-cover"
                    fallback={<div className="w-10 h-10 rounded bg-muted shrink-0" />}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium line-clamp-2">{m.question}</div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>Vol {formatVolume(m.volume)}</span>
                      <span>Liq {formatVolume(m.liquidity)}</span>
                      {m.endDate && <span>Ends {new Date(m.endDate).toLocaleDateString()}</span>}
                    </div>
                    {m.outcomes.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {m.outcomes.map(o => (
                          <span
                            key={o.tokenId || o.label}
                            className="text-xs px-2 py-0.5 rounded bg-muted text-foreground/80"
                            title={o.tokenId}
                          >
                            {o.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ToolCard.Details>
      </ToolCard.Content>
    </ToolCard.Root>
  )
}
