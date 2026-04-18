import type { PortfolioPnlOutput } from '@sola-ai/server'
import { TrendingDown, TrendingUp } from 'lucide-react'

import { StatusText } from '../ui/StatusText'
import { ToolCard } from '../ui/ToolCard'

import { useToolStateRender } from './toolUIHelpers'
import type { ToolUIComponentProps } from './toolUIHelpers'

function formatUsd(value: string): string {
  const num = parseFloat(value)
  if (Number.isNaN(num)) return '$0.00'
  return `$${Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function PnlValue({ value, percent }: { value: string; percent: string }) {
  const num = parseFloat(value)
  const isPositive = num >= 0
  const color = isPositive ? 'text-green-500' : 'text-red-500'
  const Icon = isPositive ? TrendingUp : TrendingDown
  const sign = isPositive ? '+' : '-'

  return (
    <div className={`flex items-center gap-1.5 ${color}`}>
      <Icon className="w-4 h-4" />
      <span className="font-semibold">
        {sign}
        {formatUsd(value)}
      </span>
      <span className="text-xs opacity-80">
        ({sign}
        {Math.abs(parseFloat(percent)).toFixed(2)}%)
      </span>
    </div>
  )
}

export function PortfolioPnlUI({ toolPart }: ToolUIComponentProps<'portfolioPnlTool'>) {
  const { state, output, errorText } = toolPart
  const pnlOutput = output as PortfolioPnlOutput | undefined

  const stateRender = useToolStateRender(state, {
    loading: 'Calculating portfolio PnL...',
    error: null,
  })

  if (stateRender) return stateRender

  if (state === 'output-error') {
    const message = typeof errorText === 'string' ? errorText : 'Failed to calculate PnL'
    return <StatusText.Error>{message}</StatusText.Error>
  }

  if (!pnlOutput) return null

  const timeframeLabel =
    pnlOutput.timeframe === '24h' ? '24 Hours' : pnlOutput.timeframe === '7d' ? '7 Days' : '30 Days'

  return (
    <ToolCard.Root>
      <ToolCard.Content>
        <div className="mb-3">
          <div className="text-xs text-muted-foreground mb-1">Portfolio PnL — {timeframeLabel}</div>
          <div className="text-lg font-semibold">{formatUsd(pnlOutput.totalCurrentValue)}</div>
          <PnlValue value={pnlOutput.absoluteChange} percent={pnlOutput.percentChange} />
        </div>

        {pnlOutput.assets.length > 0 && (
          <div className="space-y-1.5">
            {pnlOutput.assets.map((asset, i) => {
              const isPositive = parseFloat(asset.absoluteChange) >= 0
              const changeColor = isPositive ? 'text-green-500' : 'text-red-500'
              const sign = isPositive ? '+' : '-'

              return (
                <div
                  key={`${asset.symbol}-${asset.network}-${i}`}
                  className="flex items-center justify-between py-1.5 px-2 rounded bg-whiteAlpha-50"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{asset.symbol.toUpperCase()}</span>
                    <span className="text-xs text-muted-foreground capitalize">{asset.network}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm">{formatUsd(asset.currentValue)}</div>
                    <div className={`text-xs ${changeColor}`}>
                      {sign}
                      {formatUsd(asset.absoluteChange)} ({sign}
                      {Math.abs(parseFloat(asset.percentChange)).toFixed(2)}%)
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </ToolCard.Content>
    </ToolCard.Root>
  )
}
