import type { BuildPolymarketApiKeyRequestOutput } from '@sola-ai/server'
import { CheckCircle2, Key } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { useWalletConnection } from '@/hooks/useWalletConnection'
import { signTypedDataWithWallet } from '@/lib/stepUtils'
import { firstFourLastFour } from '@/lib/utils'
import { loadPolymarketCreds, postClobCreateApiKey, savePolymarketCreds } from '@/lib/polymarketAuth'

import { ToolCard } from '../ui/ToolCard'

import { useToolStateRender } from './toolUIHelpers'
import type { ToolUIComponentProps } from './toolUIHelpers'

type Status = 'idle' | 'checking' | 'signing' | 'submitting' | 'success' | 'already-registered' | 'error'

export function BuildPolymarketApiKeyRequestUI({ toolPart }: ToolUIComponentProps<'buildPolymarketApiKeyRequestTool'>) {
  const { state: toolState, output } = toolPart
  const { evmWallet } = useWalletConnection()
  const [status, setStatus] = useState<Status>('idle')
  const [shortApiKey, setShortApiKey] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const startedRef = useRef(false)

  const stateRender = useToolStateRender(toolState, {
    loading: 'Preparing authentication request…',
    error: 'Failed to prepare authentication',
  })

  useEffect(() => {
    if (startedRef.current) return
    if (toolState !== 'output-available' || !output || !evmWallet) return
    startedRef.current = true
    void run(output)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolState, output, evmWallet])

  async function run(data: BuildPolymarketApiKeyRequestOutput) {
    try {
      setStatus('checking')
      const existing = loadPolymarketCreds(data.address)
      if (existing) {
        setShortApiKey(firstFourLastFour(existing.apiKey))
        setStatus('already-registered')
        return
      }
      if (!evmWallet) throw new Error('Wallet not connected')

      setStatus('signing')
      await evmWallet.connector.switchNetwork({ networkChainId: 137 })
      const signature = await signTypedDataWithWallet(evmWallet, data.typedData)

      setStatus('submitting')
      const creds = await postClobCreateApiKey({
        address: data.address,
        signature,
        timestamp: data.timestamp,
        nonce: data.nonce,
      })
      savePolymarketCreds(data.address, creds)
      setShortApiKey(firstFourLastFour(creds.apiKey))
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
            <Key className="w-5 h-5 text-purple-500" />
            <span className="font-medium">Polymarket API Key</span>
          </div>
          {(status === 'success' || status === 'already-registered') && (
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          )}
        </ToolCard.HeaderRow>
      </ToolCard.Header>
      <ToolCard.Content>
        <ToolCard.Details>
          <div className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Wallet</span>
              <span>{firstFourLastFour(output.address)}</span>
            </div>
            {shortApiKey && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">API Key</span>
                <span className="font-mono text-xs">{shortApiKey}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span>
                {status === 'checking' && 'Checking local credentials…'}
                {status === 'signing' && 'Waiting for wallet signature…'}
                {status === 'submitting' && 'Registering with CLOB…'}
                {status === 'success' && 'Registered. Credentials saved locally.'}
                {status === 'already-registered' && 'Already registered. Using saved credentials.'}
                {status === 'error' && (errorMessage ?? 'Failed')}
                {status === 'idle' && 'Preparing…'}
              </span>
            </div>
          </div>
        </ToolCard.Details>
      </ToolCard.Content>
    </ToolCard.Root>
  )
}
