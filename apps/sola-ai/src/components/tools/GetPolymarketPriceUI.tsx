import { BarChart3 } from 'lucide-react'

import { ToolCard } from '../ui/ToolCard'

import { useToolStateRender } from './toolUIHelpers'
import type { ToolUIComponentProps } from './toolUIHelpers'

function fmt(value: number | null | undefined, digits = 4): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return value.toFixed(digits)
}

function fmtUsd(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return `$${value.toFixed(3)}`
}

export function GetPolymarketPriceUI({ toolPart }: ToolUIComponentProps<'getPolymarketPriceTool'>) {
  const { state, output } = toolPart

  const stateRender = useToolStateRender(state, {
    loading: 'Fetching Polymarket orderbook…',
    error: 'Failed to fetch orderbook',
  })
  if (stateRender) return stateRender

  if (!output) return null
  const { midPrice, bestBid, bestAsk, spread, bids, asks } = output

  return (
    <ToolCard.Root defaultOpen>
      <ToolCard.Header>
        <ToolCard.HeaderRow>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            <span className="font-medium">Polymarket Orderbook</span>
          </div>
          <div className="text-sm font-semibold">{fmtUsd(midPrice)}</div>
        </ToolCard.HeaderRow>
      </ToolCard.Header>
      <ToolCard.Content>
        <ToolCard.Details>
          <div className="grid grid-cols-3 gap-2 text-xs mb-3">
            <div>
              <div className="text-muted-foreground">Best Bid</div>
              <div className="font-medium text-green-600">{fmtUsd(bestBid)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Best Ask</div>
              <div className="font-medium text-red-600">{fmtUsd(bestAsk)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Spread</div>
              <div className="font-medium">{spread !== null ? spread.toFixed(3) : '—'}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-muted-foreground mb-1">Bids</div>
              {bids.length === 0 ? (
                <div className="text-muted-foreground">—</div>
              ) : (
                bids.map((l, i) => (
                  <div key={`b-${i}`} className="flex justify-between py-0.5">
                    <span className="text-green-600">{fmt(l.price, 3)}</span>
                    <span>{fmt(l.size, 2)}</span>
                  </div>
                ))
              )}
            </div>
            <div>
              <div className="text-muted-foreground mb-1">Asks</div>
              {asks.length === 0 ? (
                <div className="text-muted-foreground">—</div>
              ) : (
                asks.map((l, i) => (
                  <div key={`a-${i}`} className="flex justify-between py-0.5">
                    <span className="text-red-600">{fmt(l.price, 3)}</span>
                    <span>{fmt(l.size, 2)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </ToolCard.Details>
      </ToolCard.Content>
    </ToolCard.Root>
  )
}
