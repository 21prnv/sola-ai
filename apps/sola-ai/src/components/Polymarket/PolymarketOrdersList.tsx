import { useQueryClient } from '@tanstack/react-query'
import { ListOrdered } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { cancelOrderAndInvalidate, usePolymarketOpenOrders } from '@/hooks/usePolymarketQueries'
import { firstFourLastFour } from '@/lib/utils'

export function PolymarketOrdersList({ address }: { address: string | undefined }) {
  const { creds, data, isLoading, isError, error } = usePolymarketOpenOrders(address)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [cancellingAll, setCancellingAll] = useState(false)
  const queryClient = useQueryClient()

  if (!address) {
    return <div className="p-6 text-sm text-muted-foreground">Connect a Polygon wallet to see orders.</div>
  }
  if (!creds) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Register a Polymarket API key via chat to view open orders.
      </div>
    )
  }
  if (isLoading && !data) {
    return <div className="p-6 text-sm text-muted-foreground">Loading orders…</div>
  }
  if (isError) {
    return <div className="p-6 text-sm text-red-600">{error instanceof Error ? error.message : 'Failed'}</div>
  }

  const orders = data ?? []

  async function handleCancel(orderId: string) {
    if (!creds || !address) return
    setCancellingId(orderId)
    try {
      await cancelOrderAndInvalidate({ creds, address, orderId })
      queryClient.invalidateQueries({ queryKey: ['polymarket', 'orders'] }).catch(console.error)
      toast.success('Order canceled')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Cancel failed')
    } finally {
      setCancellingId(null)
    }
  }

  async function handleCancelAll() {
    if (!creds || !address || orders.length === 0) return
    if (!confirm(`Cancel all ${orders.length} open orders?`)) return
    setCancellingAll(true)
    try {
      for (const o of orders) {
        await cancelOrderAndInvalidate({ creds, address, orderId: o.id })
      }
      queryClient.invalidateQueries({ queryKey: ['polymarket', 'orders'] }).catch(console.error)
      toast.success('All orders canceled')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Cancel all failed')
    } finally {
      setCancellingAll(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="text-xs text-muted-foreground">{orders.length} open order(s)</div>
        {orders.length > 0 && (
          <button
            type="button"
            onClick={handleCancelAll}
            disabled={cancellingAll}
            className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-600 hover:bg-red-500/20 disabled:opacity-50"
          >
            {cancellingAll ? 'Cancelling…' : 'Cancel all'}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 text-center">
            <ListOrdered className="w-10 h-10 text-muted-foreground mb-3" />
            <div className="text-sm text-muted-foreground">No open orders.</div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {orders.map((o) => {
              const sideColor = o.side === 'BUY' ? 'text-green-600' : 'text-red-600'
              return (
                <div key={o.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0 text-xs">
                    <div className="flex gap-2 items-center text-sm">
                      <span className={`font-semibold ${sideColor}`}>{o.side}</span>
                      <span>${o.price.toFixed(3)}</span>
                      <span className="text-muted-foreground">
                        {o.sizeMatched}/{o.originalSize}
                      </span>
                    </div>
                    <div className="text-muted-foreground font-mono truncate mt-0.5">
                      {firstFourLastFour(o.assetId)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCancel(o.id)}
                    disabled={cancellingId === o.id || cancellingAll}
                    className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-600 hover:bg-red-500/20 disabled:opacity-50"
                  >
                    {cancellingId === o.id ? '…' : 'Cancel'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
