import type { ChainId } from '@sola-ai/caip'
import { Wallet } from 'lucide-react'

import { Amount } from '../ui/Amount'
import { AssetIcon } from '../ui/AssetIcon'
import { ToolCard } from '../ui/ToolCard'

import { useToolStateRender } from './toolUIHelpers'
import type { ToolUIComponentProps } from './toolUIHelpers'

const NETWORK_LABELS: Record<string, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  arbitrum: 'Arbitrum',
  base: 'Base',
  avalanche: 'Avalanche',
  optimism: 'Optimism',
  bsc: 'BNB Chain',
  gnosis: 'Gnosis',
  solana: 'Solana',
}

function formatNetworkLabel(network: string): string {
  return NETWORK_LABELS[network] ?? network.charAt(0).toUpperCase() + network.slice(1)
}

export function PortfolioUI({ toolPart }: ToolUIComponentProps<'portfolioTool'>) {
  const { state, output } = toolPart

  const stateRender = useToolStateRender(state, {
    loading: 'Fetching portfolio',
    error: 'Failed to fetch portfolio',
  })

  if (stateRender) return stateRender

  if (!output) return null

  const networksWithBalances = output.networks.filter(n => n.balances.length > 0)

  if (networksWithBalances.length === 0) {
    return (
      <ToolCard.Root>
        <ToolCard.Header>
          <ToolCard.HeaderRow>
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              <span className="font-medium">Portfolio</span>
            </div>
            <Amount.Fiat value={output.totals.overall} className="text-lg font-semibold" />
          </ToolCard.HeaderRow>
        </ToolCard.Header>
      </ToolCard.Root>
    )
  }

  return (
    <ToolCard.Root>
      <ToolCard.Header>
        <ToolCard.HeaderRow>
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            <span className="font-medium">Portfolio</span>
          </div>
          <div className="flex flex-col items-end">
            <Amount.Fiat value={output.totals.overall} className="text-lg font-semibold" />
            <span className="text-xs text-muted-foreground">
              {networksWithBalances.length} {networksWithBalances.length === 1 ? 'network' : 'networks'}
            </span>
          </div>
        </ToolCard.HeaderRow>
      </ToolCard.Header>

      <ToolCard.Content>
        <ToolCard.Details>
          <div className="space-y-5">
            {networksWithBalances.map(networkData => {
              const networkTotal = output.totals.byNetwork[networkData.network]
              const chainId = networkData.chainId as ChainId
              return (
                <div key={networkData.network}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {formatNetworkLabel(networkData.network)}
                    </span>
                    {networkTotal && (
                      <Amount.Fiat value={networkTotal} className="text-xs font-medium text-muted-foreground" />
                    )}
                  </div>

                  <div className="divide-y divide-border/60 rounded-lg bg-whiteAlpha-50/50">
                    {networkData.balances.map(balance => (
                      <div key={`${balance.assetId}`} className="flex items-center justify-between gap-3 py-2.5 px-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <AssetIcon
                            icon={balance.icon}
                            symbol={balance.symbol}
                            chainId={chainId}
                            className="w-9 h-9 shrink-0"
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium text-sm truncate">{balance.name}</span>
                            <span className="text-xs text-muted-foreground">
                              <Amount.Crypto value={balance.cryptoAmount} symbol={balance.symbol.toUpperCase()} />
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end shrink-0">
                          <Amount.Fiat value={balance.usdAmount} className="text-sm font-medium" />
                          {balance.priceChange24h !== undefined && balance.priceChange24h !== null && (
                            <Amount.Percent value={balance.priceChange24h} autoColor showSign className="text-xs" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </ToolCard.Details>
      </ToolCard.Content>
    </ToolCard.Root>
  )
}
