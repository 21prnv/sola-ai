import type { RevokeApprovalOutput } from '@sola-ai/server'

import { Execution } from '@/components/Execution'
import { useExecuteOnce } from '@/hooks/useExecuteOnce'
import { useToolExecution } from '@/hooks/useToolExecution'
import { toolStateToStepStatus } from '@/lib/executionState'
import { getExplorerUrl } from '@/lib/explorers'
import { switchNetworkStep } from '@/lib/steps/switchNetworkStep'
import { withWalletLock } from '@/lib/walletMutex'
import { executeRevoke } from '@/utils/revokeExecutor'

import { Skeleton } from '../ui/Skeleton'
import { TxStepCard } from '../ui/TxStepCard'

import type { ToolUIComponentProps } from './toolUIHelpers'

const REVOKE_STEPS = { PREPARE: 0, NETWORK: 1, REVOKE: 2 } as const

export function RevokeApprovalUI({ toolPart }: ToolUIComponentProps<'revokeApprovalTool'>) {
  const { state: toolState, output, toolCallId } = toolPart
  const revokeOutput = output as RevokeApprovalOutput | undefined

  const revokeData = toolState === 'output-available' && revokeOutput ? revokeOutput : null

  const ctx = useToolExecution(toolCallId, 'revokeApprovalTool', {})

  useExecuteOnce(ctx, revokeData, async (data: RevokeApprovalOutput, ctx) => {
    await withWalletLock(async () => {
      try {
        const { tx } = data

        if (!tx?.from) throw new Error('Invalid revoke output: missing tx.from')
        if (!tx?.chainId) throw new Error('Invalid revoke output: missing tx.chainId')

        ctx.setState(draft => {
          draft.toolOutput = data
          draft.meta.networkName = data.revokeData.network
        })
        ctx.advanceStep()

        await switchNetworkStep(ctx, data.revokeData.chainId)

        ctx.setSubstatus('Requesting signature...')
        const txHash = await executeRevoke(tx)
        ctx.setMeta({ txHash })
        ctx.advanceStep()
        ctx.markTerminal()
        ctx.persist()
      } catch (error) {
        ctx.failAndPersist(error)
      }
    })
  })

  const prepareStepStatus = toolStateToStepStatus(toolState)
  const networkName = revokeData?.revokeData?.network
  const hasError = toolState === 'output-error'
  const isLoading = !revokeOutput && !hasError
  const summary = revokeOutput?.summary

  return (
    <Execution.Root state={ctx.state} toolCallId={toolCallId}>
      <Execution.HistoricalGuard fallbackLabel="Revoke Approval">
        <TxStepCard.Root>
          <TxStepCard.Header>
            <TxStepCard.HeaderRow>
              <div className="text-sm text-muted-foreground font-normal">Spender: {summary?.spender ?? '—'}</div>
            </TxStepCard.HeaderRow>
            <TxStepCard.HeaderRow>
              {summary ? (
                <div className="text-lg font-semibold">Revoke {summary.asset} Approval</div>
              ) : (
                <Skeleton className="h-7 w-48" />
              )}
            </TxStepCard.HeaderRow>
          </TxStepCard.Header>

          {summary && (
            <TxStepCard.Content>
              <TxStepCard.Details>
                <TxStepCard.DetailItem label="Token" value={summary.asset} />
                <TxStepCard.DetailItem label="Spender" value={summary.spender} />
                <TxStepCard.DetailItem label="Current Allowance" value={summary.currentAllowance} />
                <TxStepCard.DetailItem label="Network" value={summary.network} />
              </TxStepCard.Details>
            </TxStepCard.Content>
          )}

          <Execution.Stepper>
            <Execution.Step
              index={REVOKE_STEPS.PREPARE}
              label="Preparing revoke transaction"
              overrideStatus={prepareStepStatus}
              connectorBottom
            />
            <Execution.Step
              index={REVOKE_STEPS.NETWORK}
              label={networkName ? `Switch to ${networkName}` : 'Switch network'}
              connectorTop
              connectorBottom
            />
            <Execution.Step index={REVOKE_STEPS.REVOKE} label="Sign and revoke approval" connectorTop />
          </Execution.Stepper>
          <Execution.ErrorFooter />
          {ctx.state.meta.txHash && networkName && (
            <div className="px-4 pb-4">
              <a
                href={getExplorerUrl(networkName, ctx.state.meta.txHash as string)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-500 hover:underline"
              >
                View on explorer
              </a>
            </div>
          )}
        </TxStepCard.Root>
      </Execution.HistoricalGuard>
    </Execution.Root>
  )
}
