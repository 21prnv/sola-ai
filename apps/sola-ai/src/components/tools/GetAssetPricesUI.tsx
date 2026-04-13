import { ChartLine, Pin, PinOff, TrendingDown, TrendingUp } from 'lucide-react'

import { useChatContext } from '@/providers/ChatProvider'
import { buildWatchlistKey, useWatchlistStore } from '@/stores/watchlistStore'

import { AssetIcon } from '../ui/AssetIcon'
import { Button } from '../ui/Button'
import { ToolCard } from '../ui/ToolCard'

import { useToolStateRender } from './toolUIHelpers'
import type { ToolUIComponentProps } from './toolUIHelpers'

function formatUsd(value: string): string {
  const num = Number(value)
  if (!Number.isFinite(num)) return `$${value}`
  return num.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: num >= 1 ? 2 : 4,
    maximumFractionDigits: num >= 1 ? 2 : 6,
  })
}

function changeBadge(value?: number) {
  if (value === undefined || Number.isNaN(value)) {
    return {
      className: 'text-muted-foreground',
      icon: null,
      text: '24h N/A',
    }
  }

  const isPositive = value >= 0
  return {
    className: isPositive ? 'text-green-500' : 'text-red-500',
    icon: isPositive ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />,
    text: `${isPositive ? '+' : ''}${value.toFixed(2)}%`,
  }
}

export function GetAssetPricesUI({ toolPart }: ToolUIComponentProps<'getAssetPricesTool'>) {
  const { state, output } = toolPart
  const { sendMessage } = useChatContext()
  const upsertToken = useWatchlistStore(store => store.upsertToken)
  const removeToken = useWatchlistStore(store => store.removeToken)
  const isPinned = useWatchlistStore(store => store.isPinned)

  const stateRender = useToolStateRender(state, {
    loading: 'Fetching spot prices...',
    error: 'Failed to fetch spot prices',
  })
  if (stateRender) return stateRender

  const prices = output?.prices ?? []
  if (prices.length === 0) return null

  const onOpenChart = async (symbol: string) => {
    await sendMessage({ text: `Show me the historical price chart for ${symbol} over the last 30 days.` })
  }

  return (
    <ToolCard.Root defaultOpen>
      <ToolCard.Header>
        <ToolCard.HeaderRow>
          <div className="flex items-center gap-2">
            <ChartLine className="size-4.5 text-primary" />
            <span className="font-medium">Spot prices</span>
          </div>
          <span className="text-xs text-muted-foreground">Live snapshot</span>
        </ToolCard.HeaderRow>
      </ToolCard.Header>
      <ToolCard.Content>
        <ToolCard.Details className="divide-y divide-border/60 space-y-0">
          {prices.map(price => {
            const key = buildWatchlistKey(price.symbol, undefined, price.assetId)
            const pinned = isPinned(key)
            const badge = changeBadge(price.priceChange24h)

            return (
              <div key={price.assetId} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <AssetIcon icon={price.icon} symbol={price.symbol} className="h-9 w-9" />
                  <div>
                    <div className="text-sm font-medium leading-tight">{price.name}</div>
                    <div className="text-xs text-muted-foreground">{price.symbol.toUpperCase()}</div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="text-sm font-semibold">{formatUsd(price.price)}</div>
                  <div className={`inline-flex items-center gap-1 text-xs ${badge.className}`}>
                    {badge.icon}
                    <span>{badge.text}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void onOpenChart(price.symbol)}
                      className="h-7 px-2 text-xs"
                    >
                      <ChartLine className="size-3.5" />
                      Chart
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (pinned) {
                          removeToken(key)
                        } else {
                          upsertToken({
                            symbol: price.symbol,
                            name: price.name,
                            assetId: price.assetId,
                          })
                        }
                      }}
                      className="h-7 px-2 text-xs"
                    >
                      {pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
                      {pinned ? 'Unpin' : 'Pin'}
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </ToolCard.Details>
      </ToolCard.Content>
    </ToolCard.Root>
  )
}
