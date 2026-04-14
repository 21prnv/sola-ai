import type { GasTrackerOutput } from '@sola-ai/server'

import { ToolCard } from '../ui/ToolCard'

import { useToolStateRender } from './toolUIHelpers'
import type { ToolUIComponentProps } from './toolUIHelpers'

const LEVEL_COLORS = {
  low: 'text-green-500',
  medium: 'text-yellow-500',
  high: 'text-red-500',
} as const

const LEVEL_BG = {
  low: 'bg-green-500/10',
  medium: 'bg-yellow-500/10',
  high: 'bg-red-500/10',
} as const

function capitalizeNetwork(network: string): string {
  return network.charAt(0).toUpperCase() + network.slice(1)
}

export function GasTrackerUI({ toolPart }: ToolUIComponentProps<'gasTrackerTool'>) {
  const { state, output, errorText } = toolPart
  const gasOutput = output as GasTrackerOutput | undefined

  const stateRender = useToolStateRender(state, {
    loading: 'Fetching gas prices...',
    error: null,
  })

  if (stateRender) return stateRender

  if (state === 'output-error') {
    const message = typeof errorText === 'string' ? errorText : 'Failed to fetch gas prices'
    return (
      <ToolCard.Root>
        <ToolCard.Content>
          <div className="text-sm text-red-500">{message}</div>
        </ToolCard.Content>
      </ToolCard.Root>
    )
  }

  if (!gasOutput?.chains?.length) return null

  return (
    <ToolCard.Root>
      <ToolCard.Content>
        <div className="text-sm font-medium mb-3">Gas Prices</div>
        <div className="space-y-2">
          {gasOutput.chains.map(chain => (
            <div
              key={chain.network}
              className="flex items-center justify-between py-2 px-3 rounded-lg bg-whiteAlpha-50 border border-whiteAlpha-100"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{capitalizeNetwork(chain.network)}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${LEVEL_BG[chain.level]} ${LEVEL_COLORS[chain.level]}`}>
                  {chain.level}
                </span>
              </div>
              <div className="flex items-center gap-4 text-right">
                <div>
                  <div className="text-sm font-mono">{chain.gasPriceGwei} gwei</div>
                  <div className="text-xs text-muted-foreground">~${chain.estimatedTransferCostUsd} / transfer</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ToolCard.Content>
    </ToolCard.Root>
  )
}
