import { Pin, PinOff } from 'lucide-react'

import { AssetIcon } from '@/components/ui/AssetIcon'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { useWatchlistStore, type WatchlistToken } from '@/stores/watchlistStore'

type WatchlistStripProps = {
  onTokenClick: (token: WatchlistToken) => void
}

export function WatchlistStrip({ onTokenClick }: WatchlistStripProps) {
  const tokens = useWatchlistStore(state => state.tokens)
  const removeToken = useWatchlistStore(state => state.removeToken)

  if (tokens.length === 0) return null

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-1 flex items-center gap-2 px-1 text-xs text-muted-foreground">
        <Pin className="size-3.5" />
        <span>Pinned tokens</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tokens.map(token => (
          <div
            key={token.key}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border border-border/80 bg-background/90 px-1.5 py-1',
              'backdrop-blur supports-backdrop-filter:bg-background/70'
            )}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onTokenClick(token)}
              className="h-7 gap-2 rounded-full px-2"
              title={`Open ${token.symbol} details`}
            >
              <AssetIcon icon={token.icon} symbol={token.symbol} className="h-4 w-4" />
              <span className="text-xs">{token.symbol}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeToken(token.key)}
              className="h-6 w-6 rounded-full p-0 text-muted-foreground hover:text-foreground"
              title={`Unpin ${token.symbol}`}
            >
              <PinOff className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
