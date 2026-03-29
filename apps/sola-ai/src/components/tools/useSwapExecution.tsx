import { CHAIN_NAMESPACE, fromChainId } from '@sola-ai/caip'
import type { InitiateSwapOutput } from '@sola-ai/server'
import type { DynamicToolUIPart } from 'ai'
import { toast } from 'sonner'

import { Amount } from '@/components/ui/Amount'
import { useExecuteOnce } from '@/hooks/useExecuteOnce'
import { useToolExecution } from '@/hooks/useToolExecution'
import type { SwapMeta, ToolExecutionState } from '@/lib/executionState'
import { getStepStatus, toolStateToStepStatus } from '@/lib/executionState'
import { analytics } from '@/lib/mixpanel'
import { switchNetworkStep } from '@/lib/steps/switchNetworkStep'
import type { StepStatus } from '@/lib/stepUtils'
import { withWalletLock } from '@/lib/walletMutex'
import type { SolanaWalletSigner } from '@/utils/chains/types'
import { ensureAllowance } from '@/utils/ensureAllowance'
import { parseSolaRangoEnvelope } from '@/utils/rango/parseEnvelope'
import { executeSwap } from '@/utils/swapExecutor'
import { waitForConfirmedReceipt } from '@/utils/waitForConfirmedReceipt'

function addressesMatch(a: string, b: string): boolean {
  const x = a.trim()
  const y = b.trim()
  if (x.startsWith('0x') && y.startsWith('0x')) return x.toLowerCase() === y.toLowerCase()
  return x === y
}

export const SWAP_STEPS = { QUOTE: 0, NETWORK: 1, APPROVE: 2, SWAP: 3 } as const

type SwapData = InitiateSwapOutput

interface SwapStepInfo {
  step: number
  status: StepStatus
}

interface UseSwapExecutionResult {
  state: ToolExecutionState<SwapMeta>
  steps: SwapStepInfo[]
  networkName?: string
  error?: string
  approvalTxHash?: string
  swapTxHash?: string
}

export const useSwapExecution = (
  toolCallId: string,
  toolState: DynamicToolUIPart['state'],
  swapData: SwapData | null
): UseSwapExecutionResult => {
  const ctx = useToolExecution(toolCallId, 'initiateSwapTool', {})

  useExecuteOnce(ctx, swapData, async (data, ctx) => {
    await withWalletLock(async () => {
      try {
        const { swapTx, swapData } = data

        if (!swapData) throw new Error('Invalid swap output: missing swapData')
        if (!swapTx?.from) throw new Error('Invalid swap output: missing swapTx.from')
        if (!swapTx?.chainId) throw new Error('Invalid swap output: missing swapTx.chainId')
        if (!swapData.sellAsset?.chainId) throw new Error('Invalid swap output: missing swapData.sellAsset.chainId')

        const sellAssetChainId = swapData.sellAsset.chainId
        const { chainNamespace, chainReference } = fromChainId(sellAssetChainId)
        const isRangoMultichainEnvelope = parseSolaRangoEnvelope(swapTx.data) !== null

        if (chainNamespace === CHAIN_NAMESPACE.Evm || chainNamespace === CHAIN_NAMESPACE.Solana) {
          const currentAddress =
            chainNamespace === CHAIN_NAMESPACE.Evm ? ctx.refs.evmAddress.current : ctx.refs.solanaAddress.current
          if (!currentAddress) throw new Error('Wallet disconnected. Please reconnect and try again.')
          if (!addressesMatch(currentAddress, swapTx.from)) {
            throw new Error('Wallet address changed. Please re-initiate the swap.')
          }
        } else if (!isRangoMultichainEnvelope) {
          throw new Error(
            'This chain is not supported for swaps in this session. Use a Rango route that returns a multi-chain wallet payload, or connect EVM/Solana.'
          )
        }

        let solanaSigner: SolanaWalletSigner | undefined
        if (chainNamespace === CHAIN_NAMESPACE.Solana && ctx.refs.solanaWallet.current) {
          solanaSigner = (await ctx.refs.solanaWallet.current.getSigner()) as SolanaWalletSigner
        }

        // Step 0: Quote complete
        ctx.setState(draft => {
          draft.toolOutput = data
          draft.meta.networkName = swapData.sellAsset.network
        })
        ctx.advanceStep()

        // Step 1: Network switch
        await switchNetworkStep(ctx, sellAssetChainId)

        // Step 2: Approve — re-check on-chain allowance to handle parallel swaps
        ctx.setSubstatus('Checking allowance...')
        const approvalTxHash = await ensureAllowance({
          sellAssetId: swapData.sellAsset.assetId,
          sellAssetChainId: sellAssetChainId,
          sellAssetPrecision: swapData.sellAsset.precision,
          approvalTarget: swapData.approvalTarget,
          sellAmountCryptoPrecision: swapData.sellAmountCryptoPrecision,
          sellAccount: swapData.sellAccount,
          solanaSigner,
        })

        if (approvalTxHash) {
          ctx.setMeta({ approvalTxHash })
          if (chainNamespace === CHAIN_NAMESPACE.Evm) {
            ctx.setSubstatus('Waiting for confirmation...')
            await waitForConfirmedReceipt(Number(chainReference), approvalTxHash as `0x${string}`)
          }
          ctx.advanceStep()
        } else {
          ctx.skipStep()
        }

        // Step 3: Swap
        ctx.setSubstatus('Requesting signature...')
        const swapTxHash = await executeSwap(swapTx, { solanaSigner })
        ctx.setMeta({ txHash: swapTxHash })

        if (chainNamespace === CHAIN_NAMESPACE.Evm) {
          ctx.setSubstatus('Waiting for confirmation...')
          await waitForConfirmedReceipt(Number(chainReference), swapTxHash as `0x${string}`)
        }

        ctx.advanceStep()
        ctx.markTerminal()
        ctx.persist()

        analytics.trackSwap({
          sellAsset: swapData.sellAsset.symbol,
          buyAsset: swapData.buyAsset.symbol,
          sellAmount: swapData.sellAmountCryptoPrecision,
          buyAmount: swapData.buyAmountCryptoPrecision,
          network: swapData.sellAsset.network,
        })

        toast.success(
          <span>
            Your swap of{' '}
            <Amount.Crypto
              value={swapData.sellAmountCryptoPrecision}
              symbol={swapData.sellAsset.symbol.toUpperCase()}
              decimals={6}
              className="font-bold"
            />{' '}
            to{' '}
            <Amount.Crypto
              value={swapData.buyAmountCryptoPrecision}
              symbol={swapData.buyAsset.symbol.toUpperCase()}
              decimals={6}
              className="font-bold"
            />{' '}
            is complete
          </span>
        )
      } catch (error) {
        ctx.failAndPersist(error)

        const sd = data.swapData
        toast.error(
          sd ? (
            <span>
              Your swap of{' '}
              <Amount.Crypto
                value={sd.sellAmountCryptoPrecision}
                symbol={sd.sellAsset.symbol.toUpperCase()}
                decimals={6}
                className="font-bold"
              />{' '}
              to{' '}
              <Amount.Crypto
                value={sd.buyAmountCryptoPrecision}
                symbol={sd.buyAsset.symbol.toUpperCase()}
                decimals={6}
                className="font-bold"
              />{' '}
              failed
            </span>
          ) : (
            <span>Swap failed</span>
          )
        )
      }
    })
  })

  const quoteStepStatus = toolStateToStepStatus(toolState)

  return {
    state: ctx.state,
    steps: [
      { step: SWAP_STEPS.QUOTE, status: quoteStepStatus },
      { step: SWAP_STEPS.NETWORK, status: getStepStatus(SWAP_STEPS.NETWORK, ctx.state) },
      { step: SWAP_STEPS.APPROVE, status: getStepStatus(SWAP_STEPS.APPROVE, ctx.state) },
      { step: SWAP_STEPS.SWAP, status: getStepStatus(SWAP_STEPS.SWAP, ctx.state) },
    ],
    networkName: swapData?.swapData?.sellAsset?.network,
    error: ctx.state.error,
    approvalTxHash: ctx.state.meta.approvalTxHash,
    swapTxHash: ctx.state.meta.txHash,
  }
}
