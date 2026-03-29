import { useUserWallets } from '@dynamic-labs/sdk-react-core'
import type { InitiateSwapOutput } from '@sola-ai/server'
import { Clock, Fuel, Layers } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { Execution } from '@/components/Execution'
import { Button } from '@/components/ui/Button'
import { useWalletConnection } from '@/hooks/useWalletConnection'
import { bnOrZero } from '@/lib/bignumber'
import { collectDynamicMultichainAddresses } from '@/lib/dynamicMultichainWallets'
import { StepStatus } from '@/lib/stepUtils'
import { firstFourLastFour } from '@/lib/utils'
import { fetchSwapBuild } from '@/services/swapBuildService'
import { useChatStore } from '@/stores/chatStore'
import { useOrderStore } from '@/stores/orderStore'

import { Amount } from '../ui/Amount'
import { Skeleton } from '../ui/Skeleton'
import { TxStepCard } from '../ui/TxStepCard'

import type { ToolUIComponentProps } from './toolUIHelpers'
import { SWAP_STEPS, useSwapExecution } from './useSwapExecution'
import { cn } from '@/lib/utils'

type QuoteOption = NonNullable<InitiateSwapOutput['quoteOptions']>[number]

function formatRouteDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—'
  if (seconds < 90) return `~${Math.round(seconds)}s`
  const totalMin = Math.round(seconds / 60)
  if (totalMin < 120) return `${totalMin} min`
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function priceImpactVsBest(opt: QuoteOption, index: number, list: QuoteOption[]): string | null {
  if (index === 0) return null
  const bestUsd = list[0]?.outputAmountUsd
  const curUsd = opt.outputAmountUsd
  if (bestUsd == null || curUsd == null || bestUsd <= 0) return null
  const pct = ((curUsd - bestUsd) / bestUsd) * 100
  if (Math.abs(pct) < 0.01) return null
  const sign = pct > 0 ? '+' : ''
  return `${sign}${pct.toFixed(2)}%`
}

export function InitiateSwapUI({ toolPart }: ToolUIComponentProps<'initiateSwapTool' | 'initiateSwapUsdTool'>) {
  const { state: toolState, output, toolCallId } = toolPart
  const swapOutput = output
  const wallet = useWalletConnection()
  const userWallets = useUserWallets()

  const [confirmedPreparation, setConfirmedPreparation] = useState<InitiateSwapOutput | null>(null)
  const [selectedSwapperId, setSelectedSwapperId] = useState<string | null>(null)
  const [buildError, setBuildError] = useState<string | null>(null)
  const [isBuilding, setIsBuilding] = useState(false)

  useEffect(() => {
    setConfirmedPreparation(null)
    setSelectedSwapperId(null)
    setBuildError(null)
    setIsBuilding(false)
  }, [toolCallId])

  useEffect(() => {
    const first = swapOutput?.quoteOptions?.[0]?.swapperId
    if (first) {
      setSelectedSwapperId(prev => prev ?? first)
    }
  }, [swapOutput?.quoteOptions, toolCallId])

  const executionPayload = useMemo(() => {
    if (!swapOutput) return null
    if (swapOutput.awaitingRouteSelection) {
      return confirmedPreparation
    }
    return swapOutput
  }, [swapOutput, confirmedPreparation])

  const { state, steps, networkName } = useSwapExecution(toolCallId, toolState, executionPayload)

  const routeCtx = swapOutput?.routeBuildContext
  const selectedQuote = swapOutput?.quoteOptions?.find(q => q.swapperId === selectedSwapperId)

  const swapForDisplay = useMemo(() => {
    const s = executionPayload?.swapData
    if (s) return s
    if (routeCtx && selectedQuote) {
      return {
        sellAsset: routeCtx.sellAsset,
        buyAsset: routeCtx.buyAsset,
        sellAmountCryptoPrecision: routeCtx.sellAmountCrypto,
        buyAmountCryptoPrecision: selectedQuote.outputAmount,
        sellAmountUsd: undefined,
        buyAmountUsd:
          selectedQuote.outputAmountUsd != null ? String(selectedQuote.outputAmountUsd) : undefined,
        approvalTarget: '',
        sellAccount: routeCtx.sellAccount,
        buyAccount: routeCtx.buyAccount,
      }
    }
    return null
  }, [executionPayload?.swapData, routeCtx, selectedQuote])

  const address = swapForDisplay?.sellAccount ?? routeCtx?.sellAccount

  const buyAmount = swapForDisplay ? bnOrZero(swapForDisplay.buyAmountCryptoPrecision) : bnOrZero(0)
  const sellAmount = swapForDisplay ? bnOrZero(swapForDisplay.sellAmountCryptoPrecision) : bnOrZero(0)
  const rate = buyAmount.gt(0) && sellAmount.gt(0) ? buyAmount.div(sellAmount).toFixed(6) : '—'

  const hasError = toolState === 'output-error'
  const isLoading = !swapForDisplay && !hasError

  const awaiting = Boolean(swapOutput?.awaitingRouteSelection && !confirmedPreparation)
  const quoteRouteList = swapOutput?.quoteOptions

  const handleConfirmRoute = useCallback(async () => {
    if (!swapOutput?.routeBuildContext || !selectedSwapperId) return
    setBuildError(null)
    setIsBuilding(true)
    try {
      const dynamicMultichainAddresses = collectDynamicMultichainAddresses(userWallets)
      const knownTransactions = useChatStore.getState().getKnownTransactions()
      const safeDeploymentEntries = Object.entries(wallet.safeDeploymentState ?? {})
      const safeAddresses = safeDeploymentEntries.filter(([, s]) => s.safeAddress).map(([, s]) => s.safeAddress)
      const registryOrders =
        safeAddresses.length > 0 ? useOrderStore.getState().getAllOrderSummaries(safeAddresses) : []

      const built = await fetchSwapBuild(
        {
          evmAddress: wallet.evmAddress,
          solanaAddress: wallet.solanaAddress,
          approvedChainIds: wallet.approvedChainIds,
          safeAddress: wallet.safeAddress,
          safeDeploymentState: wallet.safeDeploymentState as SwapBuildWalletState,
          ...(Object.keys(dynamicMultichainAddresses).length > 0 && { dynamicMultichainAddresses }),
          ...(knownTransactions.length > 0 && { knownTransactions }),
          ...(registryOrders.length > 0 && { registryOrders }),
        },
        {
          sellAsset: swapOutput.routeBuildContext.sellAssetInput,
          buyAsset: swapOutput.routeBuildContext.buyAssetInput,
          sellAmount: swapOutput.routeBuildContext.sellAmountCrypto,
          selectedSwapperId,
        }
      )
      setConfirmedPreparation(built)
    } catch (e) {
      setBuildError(e instanceof Error ? e.message : 'Could not build swap transaction')
    } finally {
      setIsBuilding(false)
    }
  }, [selectedSwapperId, swapOutput, userWallets, wallet])

  const feeSummary = executionPayload?.summary ?? swapOutput?.summary

  const quoteStepOverride =
    swapOutput?.awaitingRouteSelection && !confirmedPreparation
      ? StepStatus.IN_PROGRESS
      : (steps[SWAP_STEPS.QUOTE]?.status ?? StepStatus.NOT_STARTED)

  const UsdValue = () => {
    if (swapForDisplay?.buyAmountUsd) return <Amount.Fiat value={swapForDisplay.buyAmountUsd} />
    if (isLoading) return <Skeleton className="h-5 w-16" />
    return <>—</>
  }

  return (
    <Execution.Root state={state} toolCallId={toolCallId}>
      <Execution.HistoricalGuard fallbackLabel="Swap">
        <TxStepCard.Root>
          <TxStepCard.Header>
            <TxStepCard.HeaderRow>
              {address && (
                <div className="text-xs text-muted-foreground font-normal">
                  Received from {firstFourLastFour(address)}
                </div>
              )}
              <div className="text-sm text-muted-foreground font-normal">
                <UsdValue />
              </div>
            </TxStepCard.HeaderRow>
            <TxStepCard.HeaderRow>
              <TxStepCard.SwapPair
                fromSymbol={swapForDisplay?.sellAsset.symbol.toUpperCase()}
                toSymbol={swapForDisplay?.buyAsset.symbol.toUpperCase()}
                isLoading={isLoading}
              />
              <TxStepCard.Amount
                value={swapForDisplay?.buyAmountCryptoPrecision}
                symbol={swapForDisplay?.buyAsset.symbol.toUpperCase()}
                isLoading={isLoading}
              />
            </TxStepCard.HeaderRow>
          </TxStepCard.Header>

          {swapForDisplay && (
            <TxStepCard.Content>
              {awaiting && routeCtx && quoteRouteList && quoteRouteList.length > 0 && (
                <div className="mb-5 space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Live routes from Rango — select one to continue
                  </p>
                  <ul className="space-y-3">
                    {quoteRouteList.map((opt, routeIndex) => {
                      const selected = opt.swapperId === selectedSwapperId
                      const highImpact =
                        opt.resultType === 'HIGH_IMPACT' || opt.resultType === 'HIGH_IMPACT_FOR_CREATE_TX'
                      const impactLabel = priceImpactVsBest(opt, routeIndex, quoteRouteList)
                      const steps = opt.pathStepCount ?? 1
                      return (
                        <li key={opt.swapperId}>
                          <button
                            type="button"
                            onClick={() => setSelectedSwapperId(opt.swapperId)}
                            className={cn(
                              'w-full rounded-2xl border bg-card text-left shadow-sm transition-all',
                              'hover:border-muted-foreground/25',
                              selected
                                ? 'border-sky-500/70 bg-sky-500/6 ring-2 ring-sky-500/25 dark:border-sky-400/60 dark:bg-sky-400/8'
                                : 'border-border'
                            )}
                          >
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border/60 px-3 py-2.5 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <Fuel className="size-3.5 shrink-0 opacity-70" aria-hidden />
                                {opt.feeUsd != null ? (
                                  <Amount.Fiat value={String(opt.feeUsd)} />
                                ) : (
                                  '—'
                                )}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Clock className="size-3.5 shrink-0 opacity-70" aria-hidden />
                                {formatRouteDuration(opt.estimatedTimeSeconds)}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Layers className="size-3.5 shrink-0 opacity-70" aria-hidden />
                                {steps} {steps === 1 ? 'step' : 'steps'}
                              </span>
                              {routeIndex === 0 && (
                                <span className="ml-auto rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">
                                  Recommended
                                </span>
                              )}
                              {highImpact && (
                                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700 dark:text-amber-400">
                                  High impact
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 px-3 py-4 sm:gap-3">
                              <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                                {routeCtx.sellAsset.icon ? (
                                  <img
                                    src={routeCtx.sellAsset.icon}
                                    alt=""
                                    className="size-9 rounded-full bg-muted object-contain ring-1 ring-border"
                                  />
                                ) : (
                                  <div className="flex size-9 items-center justify-center rounded-full bg-muted text-xs font-bold ring-1 ring-border">
                                    {routeCtx.sellAsset.symbol.slice(0, 1).toUpperCase()}
                                  </div>
                                )}
                                <div className="text-center">
                                  <span className="text-lg font-semibold tabular-nums leading-none">
                                    {routeCtx.sellAmountCrypto}
                                  </span>
                                  <span className="ml-1 text-sm font-medium text-muted-foreground">
                                    {routeCtx.sellAsset.symbol.toUpperCase()}
                                  </span>
                                </div>
                              </div>

                              <div className="relative flex min-w-18 shrink-0 flex-col items-center px-1">
                                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 border-t border-dashed border-muted-foreground/35" />
                                <div className="relative z-1 flex flex-col items-center gap-1 bg-card px-1">
                                  {opt.swapperLogo ? (
                                    <img
                                      src={opt.swapperLogo}
                                      alt=""
                                      className="size-8 rounded-lg bg-background object-contain ring-1 ring-border"
                                    />
                                  ) : (
                                    <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-[10px] font-semibold ring-1 ring-border">
                                      R
                                    </div>
                                  )}
                                  <span className="max-w-22 truncate text-center text-[11px] font-medium leading-tight text-foreground">
                                    {opt.swapperTitle}
                                  </span>
                                </div>
                              </div>

                              <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                                {routeCtx.buyAsset.icon ? (
                                  <img
                                    src={routeCtx.buyAsset.icon}
                                    alt=""
                                    className="size-9 rounded-full bg-muted object-contain ring-1 ring-border"
                                  />
                                ) : (
                                  <div className="flex size-9 items-center justify-center rounded-full bg-muted text-xs font-bold ring-1 ring-border">
                                    {routeCtx.buyAsset.symbol.slice(0, 1).toUpperCase()}
                                  </div>
                                )}
                                <div className="text-center">
                                  <div className="text-lg font-semibold tabular-nums leading-none">
                                    <Amount.Crypto
                                      value={bnOrZero(opt.outputAmount)}
                                      symbol={routeCtx.buyAsset.symbol.toUpperCase()}
                                    />
                                  </div>
                                  {opt.outputAmountUsd != null && (
                                    <div className="mt-0.5 text-xs text-muted-foreground">
                                      ~<Amount.Fiat value={opt.outputAmountUsd.toFixed(2)} />
                                    </div>
                                  )}
                                  {impactLabel && (
                                    <div
                                      className={cn(
                                        'mt-0.5 text-xs font-medium tabular-nums',
                                        impactLabel.startsWith('-')
                                          ? 'text-amber-700 dark:text-amber-400'
                                          : 'text-emerald-600 dark:text-emerald-400'
                                      )}
                                    >
                                      {impactLabel}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                  {!wallet.isConnected && (
                    <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                      Quotes don&apos;t require a wallet. Connect your wallet when you&apos;re ready to build and sign
                      the swap.
                    </p>
                  )}
                  {buildError && <p className="text-sm text-destructive">{buildError}</p>}
                  <Button
                    type="button"
                    className="w-full"
                    disabled={!selectedSwapperId || isBuilding || !wallet.isConnected}
                    onClick={() => void handleConfirmRoute()}
                  >
                    {isBuilding ? 'Building transaction…' : 'Continue with selected route'}
                  </Button>
                </div>
              )}

              <TxStepCard.Details>
                <TxStepCard.DetailItem
                  label="Pair"
                  value={`${swapForDisplay.sellAsset.symbol.toUpperCase()} → ${swapForDisplay.buyAsset.symbol.toUpperCase()}`}
                />
                <TxStepCard.DetailItem
                  label="Buy Amount"
                  value={<Amount.Crypto value={buyAmount} symbol={swapForDisplay.buyAsset.symbol.toUpperCase()} />}
                />
                <TxStepCard.DetailItem
                  label="Sell Amount"
                  value={<Amount.Crypto value={sellAmount} symbol={swapForDisplay.sellAsset.symbol.toUpperCase()} />}
                />
                <TxStepCard.DetailItem
                  label="Rate"
                  value={`1 ${swapForDisplay.sellAsset.symbol.toUpperCase()} = ${rate} ${swapForDisplay.buyAsset.symbol.toUpperCase()}`}
                />
                <TxStepCard.DetailItem
                  label="Network Fees"
                  value={
                    feeSummary?.exchange?.networkFeeCrypto && feeSummary?.exchange?.networkFeeUsd ? (
                      <Amount.Crypto
                        value={feeSummary.exchange.networkFeeCrypto}
                        symbol={feeSummary.exchange.networkFeeSymbol}
                        suffix={
                          <>
                            (<Amount.Fiat value={feeSummary.exchange.networkFeeUsd} />)
                          </>
                        }
                      />
                    ) : selectedQuote?.feeUsd != null ? (
                      <Amount.Fiat value={String(selectedQuote.feeUsd)} />
                    ) : (
                      <Skeleton className="h-4 w-20" />
                    )
                  }
                />
              </TxStepCard.Details>
            </TxStepCard.Content>
          )}

          <Execution.Stepper>
            <Execution.Step
              index={SWAP_STEPS.QUOTE}
              label={awaiting ? 'Review routes' : 'Getting swap quote'}
              overrideStatus={quoteStepOverride}
              connectorBottom
            />
            <Execution.Step
              index={SWAP_STEPS.NETWORK}
              label={networkName ? `Switch to ${networkName}` : 'Switch network'}
              connectorTop
              connectorBottom
            />
            <Execution.Step index={SWAP_STEPS.APPROVE} label="Approve token spending" connectorTop connectorBottom />
            <Execution.Step index={SWAP_STEPS.SWAP} label="Sign swap transaction" connectorTop />
          </Execution.Stepper>
          <Execution.ErrorFooter />
        </TxStepCard.Root>
      </Execution.HistoricalGuard>
    </Execution.Root>
  )
}

type SwapBuildWalletState = Record<
  string,
  {
    isDeployed: boolean
    modulesEnabled: boolean
    domainVerifierSet: boolean
    safeAddress: string
  }
>
