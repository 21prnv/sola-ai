import { Briefcase } from 'lucide-react'

import { usePolymarketPositions } from '@/hooks/usePolymarketQueries'

import { SafeImage } from '../ui/SafeImage'

function fmtUsd(value: number): string {
  const sign = value < 0 ? '-' : ''
  return `${sign}$${Math.abs(value).toFixed(2)}`
}

function pnlColor(value: number): string {
  if (value > 0) return 'text-green-600'
  if (value < 0) return 'text-red-600'
  return ''
}

export function PolymarketPositionsList({ address }: { address: string | undefined }) {
  const { data, isLoading, isError, error } = usePolymarketPositions(address)

  if (!address) {
    return <div className="p-6 text-sm text-muted-foreground">Connect a Polygon wallet to see positions.</div>
  }
  if (isLoading && !data) {
    return <div className="p-6 text-sm text-muted-foreground">Loading positions…</div>
  }
  if (isError) {
    return (
      <div className="p-6 text-sm text-red-600">
        {error instanceof Error ? error.message : 'Failed to load positions'}
      </div>
    )
  }

  const positions = data ?? []
  const totals = positions.reduce(
    (acc, p) => ({
      initialValue: acc.initialValue + p.initialValue,
      currentValue: acc.currentValue + p.currentValue,
      cashPnl: acc.cashPnl + p.cashPnl,
      realizedPnl: acc.realizedPnl + p.realizedPnl,
    }),
    { initialValue: 0, currentValue: 0, cashPnl: 0, realizedPnl: 0 }
  )

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border">
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <div className="text-muted-foreground">Current</div>
            <div className="font-semibold text-sm">{fmtUsd(totals.currentValue)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Unrealized</div>
            <div className={`font-semibold text-sm ${pnlColor(totals.cashPnl)}`}>{fmtUsd(totals.cashPnl)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Realized</div>
            <div className={`font-semibold text-sm ${pnlColor(totals.realizedPnl)}`}>{fmtUsd(totals.realizedPnl)}</div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {positions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 text-center">
            <Briefcase className="w-10 h-10 text-muted-foreground mb-3" />
            <div className="text-sm text-muted-foreground">No open positions.</div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {positions.map(p => (
              <div key={p.tokenId || p.conditionId} className="px-4 py-3 flex gap-3 items-start">
                <SafeImage
                  src={p.icon}
                  alt=""
                  className="w-9 h-9 rounded shrink-0 object-cover"
                  fallback={<div className="w-9 h-9 rounded bg-muted shrink-0" />}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm line-clamp-2">{p.title}</div>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-x-2 mt-0.5">
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
      </div>
    </div>
  )
}
