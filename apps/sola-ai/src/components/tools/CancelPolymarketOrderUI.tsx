import type { CancelPolymarketOrderOutput } from '@sola-ai/server'
import { CheckCircle2, XCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { cancelOrders, loadPolymarketCreds } from '@/lib/polymarketAuth'
import { firstFourLastFour } from '@/lib/utils'

import { ToolCard } from '../ui/ToolCard'

import { useToolStateRender } from './toolUIHelpers'
import type { ToolUIComponentProps } from './toolUIHelpers'

type Status = 'idle' | 'no-creds' | 'cancelling' | 'success' | 'error'

export function CancelPolymarketOrderUI({ toolPart }: ToolUIComponentProps<'cancelPolymarketOrderTool'>) {
  const { state: toolState, output } = toolPart
  const [status, setStatus] = useState<Status>('idle')
  const [canceled, setCanceled] = useState<string[]>([])
  const [notCanceled, setNotCanceled] = useState<Record<string, string>>({})
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const startedRef = useRef(false)

  const stateRender = useToolStateRender(toolState, {
    loading: 'Preparing cancellation…',
    error: 'Failed to cancel',
  })

  useEffect(() => {
    if (startedRef.current) return
    if (toolState !== 'output-available' || !output) return
    startedRef.current = true
    void run(output)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolState, output])

  async function run(data: CancelPolymarketOrderOutput) {
    try {
      const creds = loadPolymarketCreds(data.owner)
      if (!creds) {
        setStatus('no-creds')
        setErrorMessage('No Polymarket API credentials. Register first.')
        return
      }
      setStatus('cancelling')
      const res = await cancelOrders({
        creds,
        address: data.owner,
        orderId: data.orderId,
        orderIds: data.orderIds,
        cancelAll: data.cancelAll,
      })
      setCanceled(res.canceled)
      setNotCanceled(res.notCanceled)
      setStatus('success')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err))
      setStatus('error')
    }
  }

  if (stateRender) return stateRender
  if (!output) return null

  return (
    <ToolCard.Root defaultOpen>
      <ToolCard.Header>
        <ToolCard.HeaderRow>
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-500" />
            <span className="font-medium">Cancel Polymarket Orders</span>
          </div>
          {status === 'success' && <CheckCircle2 className="w-5 h-5 text-green-600" />}
        </ToolCard.HeaderRow>
      </ToolCard.Header>
      <ToolCard.Content>
        <ToolCard.Details>
          <div className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Action</span>
              <span>{output.summary}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Wallet</span>
              <span>{firstFourLastFour(output.owner)}</span>
            </div>
            {status === 'success' && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Canceled</span>
                  <span className="text-green-600">{canceled.length} order(s)</span>
                </div>
                {Object.keys(notCanceled).length > 0 && (
                  <div className="pt-2 border-t border-border">
                    <div className="text-muted-foreground mb-1">Failed:</div>
                    {Object.entries(notCanceled).map(([id, reason]) => (
                      <div key={id} className="text-xs flex justify-between">
                        <span className="font-mono">{firstFourLastFour(id)}</span>
                        <span className="text-red-500">{reason}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
            <div className="flex justify-between pt-2 border-t border-border">
              <span className="text-muted-foreground">Status</span>
              <span>
                {status === 'idle' && 'Preparing…'}
                {status === 'no-creds' && 'No credentials'}
                {status === 'cancelling' && 'Cancelling…'}
                {status === 'success' && 'Done'}
                {status === 'error' && (errorMessage ?? 'Failed')}
              </span>
            </div>
          </div>
        </ToolCard.Details>
      </ToolCard.Content>
    </ToolCard.Root>
  )
}
