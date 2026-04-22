import { Briefcase } from 'lucide-react'

import { SafeImage } from '../ui/SafeImage'
import { ToolCard } from '../ui/ToolCard'

import { useToolStateRender } from './toolUIHelpers'
import type { ToolUIComponentProps } from './toolUIHelpers'

function fmtUsd(value: number): string {
  const sign = value < 0 ? '-' : ''
  return `${sign}$${Math.abs(value).toFixed(2)}`
}

function pnlColor(value: number): string {
  if (value > 0) return 'text-green-600'
  if (value < 0) return 'text-red-600'
  return ''
}

export function GetPolymarketPositionsUI({ toolPart }: ToolUIComponentProps<'getPolymarketPositionsTool'>) {
  const { state, output } = toolPart

  const stateRender = useToolStateRender(state, {
    loading: 'Loading Polymarket positions…',
    error: 'Failed to load positions',
  })
  if (stateRender) return stateRender
  if (!output) return null

  const { positions, totals } = output

  return (
    <ToolCard.Root defaultOpen>
      <ToolCard.Header>
        <ToolCard.HeaderRow>
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-indigo-500" />
            <span className="font-medium">Polymarket Positions</span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground mr-2">Current</span>
            <span className="font-semibold">{fmtUsd(totals.currentValue)}</span>
          </div>
        </ToolCard.HeaderRow>
      </ToolCard.Header>
      <ToolCard.Content>
        <ToolCard.Details>
          <div className="grid grid-cols-3 gap-2 text-xs mb-3 pb-3 border-b border-border">
            <div>
              <div className="text-muted-foreground">Initial</div>
              <div className="font-medium">{fmtUsd(totals.initialValue)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Unrealized P&L</div>
              <div className={`font-medium ${pnlColor(totals.cashPnl)}`}>{fmtUsd(totals.cashPnl)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Realized P&L</div>
              <div className={`font-medium ${pnlColor(totals.realizedPnl)}`}>{fmtUsd(totals.realizedPnl)}</div>
            </div>
          </div>

          {positions.length === 0 ? (
            <div className="text-sm text-muted-foreground">No open positions.</div>
          ) : (
            <div className="divide-y divide-border">
              {positions.map(p => (
                <div key={p.tokenId || p.conditionId} className="py-2 flex gap-3 items-start">
                  <SafeImage
                    src={p.icon}
                    alt=""
                    className="w-8 h-8 rounded shrink-0 object-cover"
                    fallback={<div className="w-8 h-8 rounded bg-muted shrink-0" />}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm line-clamp-2">{p.title}</div>
                    <div className="text-xs text-muted-foreground flex gap-2 mt-0.5">
                      <span>{p.outcome}</span>
                      <span>·</span>
                      <span>
                        {p.size.toFixed(0)} @ ${p.avgPrice.toFixed(3)}
                      </span>
                      <span>·</span>
                      <span>now ${p.currentPrice.toFixed(3)}</span>
                    </div>
                  </div>
                  <div className="text-right text-xs shrink-0">
                    <div className="font-medium">{fmtUsd(p.currentValue)}</div>
                    <div className={pnlColor(p.cashPnl)}>
                      {fmtUsd(p.cashPnl)} ({p.percentPnl.toFixed(1)}%)
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ToolCard.Details>
      </ToolCard.Content>
    </ToolCard.Root>
  )
}
