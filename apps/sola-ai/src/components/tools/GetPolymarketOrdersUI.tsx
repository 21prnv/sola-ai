import type { GetPolymarketOrdersOutput } from '@sola-ai/server'
import { ListOrdered } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { cancelOrders, fetchOpenOrders, loadPolymarketCreds } from '@/lib/polymarketAuth'
import type { ClobOpenOrder } from '@/lib/polymarketAuth'
import { firstFourLastFour } from '@/lib/utils'

import { ToolCard } from '../ui/ToolCard'

import { useToolStateRender } from './toolUIHelpers'
import type { ToolUIComponentProps } from './toolUIHelpers'

type Status = 'loading' | 'no-creds' | 'ready' | 'error'

export function GetPolymarketOrdersUI({ toolPart }: ToolUIComponentProps<'getPolymarketOrdersTool'>) {
  const { state: toolState, output } = toolPart
  const [status, setStatus] = useState<Status>('loading')
  const [orders, setOrders] = useState<ClobOpenOrder[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const startedRef = useRef(false)

  const stateRender = useToolStateRender(toolState, {
    loading: 'Loading orders…',
    error: 'Failed to load orders',
  })

  useEffect(() => {
    if (startedRef.current) return
    if (toolState !== 'output-available' || !output) return
    startedRef.current = true
    void run(output)
  }, [toolState, output])

  async function run(data: GetPolymarketOrdersOutput) {
    try {
      const creds = await loadPolymarketCreds(data.owner)
      if (!creds) {
        setStatus('no-creds')
        setErrorMessage('No Polymarket API credentials. Register first.')
        return
      }
      const list = await fetchOpenOrders({
        creds,
        address: data.owner,
        market: data.market,
        tokenId: data.tokenId,
      })
      setOrders(list)
      setStatus('ready')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err))
      setStatus('error')
    }
  }

  async function handleCancel(orderId: string) {
    if (!output) return
    const creds = await loadPolymarketCreds(output.owner)
    if (!creds) return
    setCancellingId(orderId)
    try {
      await cancelOrders({ creds, address: output.owner, orderId })
      setOrders(prev => prev.filter(o => o.id !== orderId))
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err))
    } finally {
      setCancellingId(null)
    }
  }

  if (stateRender) return stateRender
  if (!output) return null

  return (
    <ToolCard.Root defaultOpen>
      <ToolCard.Header>
        <ToolCard.HeaderRow>
          <div className="flex items-center gap-2">
            <ListOrdered className="w-5 h-5 text-purple-500" />
            <span className="font-medium">Polymarket Open Orders</span>
          </div>
          <span className="text-xs text-muted-foreground">{orders.length} open</span>
        </ToolCard.HeaderRow>
      </ToolCard.Header>
      <ToolCard.Content>
        <ToolCard.Details>
          {status === 'loading' && <div className="text-sm text-muted-foreground">Loading…</div>}
          {status === 'no-creds' && <div className="text-sm text-amber-600">{errorMessage}</div>}
          {status === 'error' && <div className="text-sm text-red-600">{errorMessage}</div>}
          {status === 'ready' && orders.length === 0 && (
            <div className="text-sm text-muted-foreground">No open orders.</div>
          )}
          {status === 'ready' && orders.length > 0 && (
            <div className="divide-y divide-border">
              {orders.map(o => {
                const sideColor = o.side === 'BUY' ? 'text-green-600' : 'text-red-600'
                return (
                  <div key={o.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                    <div className="flex-1 min-w-0">
                      <div className="flex gap-2 items-center">
                        <span className={`font-semibold ${sideColor}`}>{o.side}</span>
                        <span>${o.price.toFixed(3)}</span>
                        <span className="text-muted-foreground">
                          {o.sizeMatched}/{o.originalSize}
                        </span>
                      </div>
                      <div className="text-muted-foreground font-mono truncate">{firstFourLastFour(o.assetId)}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCancel(o.id)}
                      disabled={cancellingId === o.id}
                      className="px-2 py-1 rounded bg-red-500/10 text-red-600 hover:bg-red-500/20 disabled:opacity-50"
                    >
                      {cancellingId === o.id ? 'Cancelling…' : 'Cancel'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </ToolCard.Details>
      </ToolCard.Content>
    </ToolCard.Root>
  )
}
