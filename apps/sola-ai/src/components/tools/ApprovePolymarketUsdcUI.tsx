import { fromChainId } from '@sola-ai/caip'
import type { ApprovePolymarketUsdcOutput } from '@sola-ai/server'
import { toast } from 'sonner'

import { Execution } from '@/components/Execution'
import { useExecuteOnce } from '@/hooks/useExecuteOnce'
import { useToolExecution } from '@/hooks/useToolExecution'
import { toolStateToStepStatus } from '@/lib/executionState'
import { switchNetworkStepByChainIdNumber } from '@/lib/steps/switchNetworkStep'
import { firstFourLastFour } from '@/lib/utils'
import { withWalletLock } from '@/lib/walletMutex'
import { sendTransaction } from '@/utils/sendTransaction'

import { Skeleton } from '../ui/Skeleton'
import { TxStepCard } from '../ui/TxStepCard'

import type { ToolUIComponentProps } from './toolUIHelpers'

const STEPS = { PREPARE: 0, NETWORK: 1, APPROVE: 2 } as const

export function ApprovePolymarketUsdcUI({ toolPart }: ToolUIComponentProps<'approvePolymarketUsdcTool'>) {
  const { state: toolState, output, toolCallId } = toolPart
  const approvalData = toolState === 'output-available' && output ? output : null

  const ctx = useToolExecution(toolCallId, 'approvePolymarketUsdcTool', {})

  useExecuteOnce(ctx, approvalData, async (data: ApprovePolymarketUsdcOutput, ctx) => {
    await withWalletLock(async () => {
      try {
        const { approveTx } = data
        if (!ctx.refs.evmAddress.current) {
          throw new Error('Wallet disconnected. Please reconnect and try again.')
        }

        ctx.setState(draft => {
          draft.toolOutput = data
          draft.meta.networkName = data.summary.network
        })
        ctx.advanceStep()

        const { chainReference } = fromChainId(approveTx.chainId)
        await switchNetworkStepByChainIdNumber(ctx, Number(chainReference))

        ctx.setSubstatus('Requesting signature…')
        const txHash = await sendTransaction({
          chainId: approveTx.chainId,
          data: approveTx.data,
          from: approveTx.from,
          to: approveTx.to,
          value: approveTx.value,
        })
        ctx.setMeta({ txHash })
        ctx.advanceStep()
        ctx.markTerminal()
        ctx.persist()

        toast.success('Polymarket USDC approval submitted')
      } catch (error) {
        ctx.failAndPersist(error)
        toast.error('Polymarket USDC approval failed')
      }
    })
  })

  const prepareStepStatus = toolStateToStepStatus(toolState)
  const summary = output?.summary
  const hasError = toolState === 'output-error'
  const isLoading = !summary && !hasError

  return (
    <Execution.Root state={ctx.state} toolCallId={toolCallId}>
      <Execution.HistoricalGuard fallbackLabel="Polymarket USDC approval">
        <TxStepCard.Root>
          <TxStepCard.Header>
            <TxStepCard.HeaderRow>
              <div className="text-xs text-muted-foreground font-normal">Polymarket</div>
              {summary && <div className="text-xs text-muted-foreground font-normal">{summary.network}</div>}
            </TxStepCard.HeaderRow>
            <TxStepCard.HeaderRow>
              {summary ? (
                <div className="text-lg font-semibold">Approve USDC</div>
              ) : isLoading ? (
                <Skeleton className="h-7 w-40" />
              ) : null}
              <TxStepCard.Amount
                value={summary?.unlimited ? '∞' : summary?.amount}
                symbol="USDC"
                isLoading={isLoading}
              />
            </TxStepCard.HeaderRow>
          </TxStepCard.Header>

          {summary && (
            <TxStepCard.Content>
              <TxStepCard.Details>
                <TxStepCard.DetailItem
                  label="Amount"
                  value={summary.unlimited ? 'Unlimited' : `${summary.amount} USDC`}
                />
                <TxStepCard.DetailItem label="Spender" value={firstFourLastFour(summary.spender)} />
                <TxStepCard.DetailItem label="From" value={firstFourLastFour(summary.fromAddress)} />
                <TxStepCard.DetailItem label="Network" value={summary.network} />
              </TxStepCard.Details>
            </TxStepCard.Content>
          )}

          <Execution.Stepper>
            <Execution.Step
              index={STEPS.PREPARE}
              label="Preparing approval"
              overrideStatus={prepareStepStatus}
              connectorBottom
            />
            <Execution.Step index={STEPS.NETWORK} label="Switch to Polygon" connectorTop connectorBottom />
            <Execution.Step index={STEPS.APPROVE} label="Approve USDC" connectorTop />
          </Execution.Stepper>
          <Execution.ErrorFooter />
        </TxStepCard.Root>
      </Execution.HistoricalGuard>
    </Execution.Root>
  )
}
