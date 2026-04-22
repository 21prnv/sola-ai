import type { BuildPolymarketOrderOutput } from '@sola-ai/server'
import { ArrowRightCircle, CheckCircle2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { useWalletConnection } from '@/hooks/useWalletConnection'
import { loadPolymarketCreds, submitSignedOrder } from '@/lib/polymarketAuth'
import { signTypedDataWithWallet } from '@/lib/stepUtils'
import { firstFourLastFour } from '@/lib/utils'

import { ToolCard } from '../ui/ToolCard'

import { useToolStateRender, markToolExecuted, wasToolExecuted } from './toolUIHelpers'
import type { ToolUIComponentProps } from './toolUIHelpers'

type Status = 'idle' | 'no-creds' | 'signing' | 'submitting' | 'success' | 'error'

export function BuildPolymarketOrderUI({ toolPart }: ToolUIComponentProps<'buildPolymarketOrderTool'>) {
  const { state: toolState, output } = toolPart
  const { evmWallet } = useWalletConnection()
  const [status, setStatus] = useState<Status>('idle')
  const [orderId, setOrderId] = useState<string | null>(null)
  const [resultStatus, setResultStatus] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const startedRef = useRef(false)

  const stateRender = useToolStateRender(toolState, {
    loading: 'Building order…',
    error: 'Failed to build order',
  })

  useEffect(() => {
    if (startedRef.current) return
    if (toolState !== 'output-available' || !output || !evmWallet) return
    if (wasToolExecuted(toolPart.toolCallId)) return
    startedRef.current = true
    markToolExecuted(toolPart.toolCallId)
    void run(output)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolState, output, evmWallet])

  async function run(data: BuildPolymarketOrderOutput) {
    try {
      const creds = await loadPolymarketCreds(data.summary.maker)
      if (!creds) {
        setStatus('no-creds')
        setErrorMessage('No Polymarket API credentials found. Register first.')
        return
      }
      if (!evmWallet) throw new Error('Wallet not connected')

      setStatus('signing')
      await evmWallet.connector.switchNetwork({ networkChainId: 137 })
      const signature = await signTypedDataWithWallet(evmWallet, data.typedData)

      setStatus('submitting')
      const res = await submitSignedOrder({
        creds,
        address: data.summary.maker,
        order: data.order as unknown as Record<string, unknown>,
        signature,
      })
      if (!res.success) {
        setErrorMessage(res.errorMessage ?? 'Order submission failed')
        setStatus('error')
        return
      }
      setOrderId(res.orderId ?? null)
      setResultStatus(res.status ?? 'submitted')
      setStatus('success')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err))
      setStatus('error')
    }
  }

  if (stateRender) return stateRender
  if (!output) return null

  const summary = output.summary
  const sideColor = summary.side === 'BUY' ? 'text-green-600' : 'text-red-600'

  return (
    <ToolCard.Root defaultOpen>
      <ToolCard.Header>
        <ToolCard.HeaderRow>
          <div className="flex items-center gap-2">
            <ArrowRightCircle className="w-5 h-5 text-blue-500" />
            <span className="font-medium">Polymarket Order</span>
          </div>
          {status === 'success' && <CheckCircle2 className="w-5 h-5 text-green-600" />}
        </ToolCard.HeaderRow>
      </ToolCard.Header>
      <ToolCard.Content>
        <ToolCard.Details>
          <div className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Side</span>
              <span className={`font-semibold ${sideColor}`}>{summary.side}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Price</span>
              <span>${summary.price.toFixed(3)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Size</span>
              <span>{summary.size} shares</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span>${summary.totalUsdc.toFixed(2)} USDC</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Maker</span>
              <span>{firstFourLastFour(summary.maker)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expiration</span>
              <span className="text-xs">{summary.expiration}</span>
            </div>
            {orderId && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order ID</span>
                <span className="font-mono text-xs">{firstFourLastFour(orderId)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-border">
              <span className="text-muted-foreground">Status</span>
              <span>
                {status === 'idle' && 'Preparing…'}
                {status === 'no-creds' && 'No API credentials — register first'}
                {status === 'signing' && 'Waiting for wallet signature…'}
                {status === 'submitting' && 'Submitting to CLOB…'}
                {status === 'success' && (resultStatus ?? 'Submitted')}
                {status === 'error' && (errorMessage ?? 'Failed')}
              </span>
            </div>
          </div>
        </ToolCard.Details>
      </ToolCard.Content>
    </ToolCard.Root>
  )
}
