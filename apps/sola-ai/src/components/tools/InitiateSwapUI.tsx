import { useUserWallets } from '@dynamic-labs/sdk-react-core'
import type { InitiateSwapOutput } from '@sola-ai/server'
import { AnimatePresence, motion } from 'framer-motion'
import { Clock, Copy, Check, ExternalLink, Fuel, Layers, RefreshCw, ShieldAlert } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Execution } from '@/components/Execution'
import { Button } from '@/components/ui/Button'
import { useWalletConnection } from '@/hooks/useWalletConnection'
import { bnOrZero } from '@/lib/bignumber'
import { collectDynamicMultichainAddresses } from '@/lib/dynamicMultichainWallets'
import { StepStatus } from '@/lib/stepUtils'
import { firstFourLastFour, cn } from '@/lib/utils'
import { getExplorerUrl } from '@/lib/explorers'
import { fetchSwapBuild } from '@/services/swapBuildService'
import { useChatStore } from '@/stores/chatStore'
import { useOrderStore } from '@/stores/orderStore'

import { Amount } from '../ui/Amount'
import { Skeleton } from '../ui/Skeleton'
import { TxStepCard } from '../ui/TxStepCard'

import type { ToolUIComponentProps } from './toolUIHelpers'
import { SWAP_STEPS, useSwapExecution } from './useSwapExecution'

type QuoteOption = NonNullable<InitiateSwapOutput['quoteOptions']>[number]

const QUOTE_TTL_SECONDS = 30

/* ── Helpers ── */

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

/* ── Sub-components ── */

/** Inline copy-hash button */
function CopyHash({ hash }: { hash: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(hash)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [hash])
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="ml-1.5 inline-flex items-center gap-1 rounded bg-muted/60 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      title="Copy transaction hash"
    >
      {hash.slice(0, 6)}…{hash.slice(-4)}
      {copied ? <Check className="size-2.5" /> : <Copy className="size-2.5" />}
    </button>
  )
}

/** Animated flip text for rate changes */
function FlipRate({ value, className }: { value: string; className?: string }) {
  const [displayValue, setDisplayValue] = useState(value)
  const [isFlipping, setIsFlipping] = useState(false)
  const prevValueRef = useRef(value)

  useEffect(() => {
    if (value !== prevValueRef.current) {
      prevValueRef.current = value
      setIsFlipping(true)
      const timer = setTimeout(() => {
        setDisplayValue(value)
        setIsFlipping(false)
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [value])

  return (
    <span className={cn('inline-block overflow-hidden', className)}>
      <span
        className={cn(
          'inline-block transition-all duration-300',
          isFlipping ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'
        )}
      >
        {displayValue}
      </span>
    </span>
  )
}

/** Countdown bar with smooth color gradient */
function QuoteCountdown({
  secondsLeft,
  total,
  expired,
  onRefresh,
  isRefreshing,
}: {
  secondsLeft: number
  total: number
  expired: boolean
  onRefresh: () => void
  isRefreshing: boolean
}) {
  const pct = Math.max(0, (secondsLeft / total) * 100)
  const ratio = secondsLeft / total

  // Smooth gradient: green (>60%) → amber (30-60%) → red (<30%)
  const barColor =
    expired
      ? 'rgb(239 68 68)'
      : ratio > 0.6
        ? `rgb(${Math.round(34 + (245 - 34) * (1 - ratio) * 2.5)}, ${Math.round(197 - 80 * (1 - ratio))}, ${Math.round(94 - 50 * (1 - ratio))})`
        : ratio > 0.3
          ? `rgb(245, ${Math.round(158 - (158 - 100) * (0.6 - ratio) / 0.3)}, 11)`
          : `rgb(${Math.round(245 - (245 - 239) * (0.3 - ratio) / 0.3)}, ${Math.round(100 * ratio / 0.3)}, ${Math.round(68 * ratio / 0.3)})`

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted/60 overflow-hidden backdrop-blur-sm">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: barColor }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: 'linear' }}
        />
      </div>
      {expired ? (
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1 text-[10px] font-medium text-destructive hover:text-destructive/80 transition-colors"
        >
          <RefreshCw className={cn('size-3', isRefreshing && 'animate-spin')} />
          {isRefreshing ? 'Refreshing…' : 'Expired — refresh'}
        </button>
      ) : (
        <span
          className={cn(
            'text-[10px] tabular-nums font-semibold transition-colors duration-500',
            secondsLeft <= 10 ? 'text-red-400' : secondsLeft <= 20 ? 'text-amber-400' : 'text-emerald-400'
          )}
        >
          {secondsLeft}s
        </span>
      )}
    </div>
  )
}

/** Skeleton placeholder for a route card */
function RouteCardSkeleton() {
  return (
    <div className="w-full rounded-2xl border border-border/60 overflow-hidden">
      <div className="flex items-center gap-4 border-b border-border/40 px-3 py-2.5">
        <div className="h-3 w-12 rounded route-skeleton-shimmer" />
        <div className="h-3 w-10 rounded route-skeleton-shimmer" />
        <div className="h-3 w-14 rounded route-skeleton-shimmer" />
      </div>
      <div className="flex items-center gap-3 px-3 py-4">
        <div className="flex-1 flex flex-col items-center gap-2">
          <div className="size-9 rounded-full route-skeleton-shimmer" />
          <div className="h-4 w-16 rounded route-skeleton-shimmer" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="size-8 rounded-lg route-skeleton-shimmer" />
          <div className="h-3 w-12 rounded route-skeleton-shimmer" />
        </div>
        <div className="flex-1 flex flex-col items-center gap-2">
          <div className="size-9 rounded-full route-skeleton-shimmer" />
          <div className="h-4 w-16 rounded route-skeleton-shimmer" />
        </div>
      </div>
    </div>
  )
}

/** Success particle burst overlay */
function SwapSuccessParticles() {
  const particles = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => {
      const angle = (i / 24) * 360
      const distance = 40 + Math.random() * 60
      const size = 3 + Math.random() * 4
      const duration = 0.6 + Math.random() * 0.4
      const hue = Math.random() > 0.5 ? '265' : '142' // purple or green
      return { angle, distance, size, duration, hue, delay: Math.random() * 0.15 }
    })
  }, [])

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center overflow-hidden">
      {particles.map((p, i) => {
        const rad = (p.angle * Math.PI) / 180
        const tx = Math.cos(rad) * p.distance
        const ty = Math.sin(rad) * p.distance
        return (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: p.size,
              height: p.size,
              backgroundColor: `oklch(0.7 0.2 ${p.hue})`,
            }}
            initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
            animate={{ x: tx, y: ty, scale: 0, opacity: 0 }}
            transition={{ duration: p.duration, delay: p.delay, ease: 'easeOut' }}
          />
        )
      })}
    </div>
  )
}

/** Hook: countdown timer for quote expiry */
function useQuoteCountdown(isActive: boolean) {
  const [secondsLeft, setSecondsLeft] = useState(QUOTE_TTL_SECONDS)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const reset = useCallback(() => {
    setSecondsLeft(QUOTE_TTL_SECONDS)
  }, [])

  useEffect(() => {
    if (!isActive) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }
    setSecondsLeft(QUOTE_TTL_SECONDS)
    intervalRef.current = setInterval(() => {
      setSecondsLeft(prev => (prev <= 0 ? 0 : prev - 1))
    }, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isActive])

  return { secondsLeft, expired: secondsLeft <= 0, reset }
}

/* ── Main component ── */

export function InitiateSwapUI({ toolPart }: ToolUIComponentProps<'initiateSwapTool' | 'initiateSwapUsdTool'>) {
  const { state: toolState, output, toolCallId } = toolPart
  const swapOutput = output
  const wallet = useWalletConnection()
  const userWallets = useUserWallets()

  const [confirmedPreparation, setConfirmedPreparation] = useState<InitiateSwapOutput | null>(null)
  const [selectedSwapperId, setSelectedSwapperId] = useState<string | null>(null)
  const [buildError, setBuildError] = useState<string | null>(null)
  const [isBuilding, setIsBuilding] = useState(false)
  const [highImpactAcknowledged, setHighImpactAcknowledged] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showParticles, setShowParticles] = useState(false)

  const awaiting = Boolean(swapOutput?.awaitingRouteSelection && !confirmedPreparation && !isBuilding)
  const { secondsLeft, expired: quotesExpired, reset: resetCountdown } = useQuoteCountdown(awaiting)

  useEffect(() => {
    setConfirmedPreparation(null)
    setSelectedSwapperId(null)
    setBuildError(null)
    setIsBuilding(false)
    setHighImpactAcknowledged(false)
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

  const { state, steps, networkName, approvalTxHash, swapTxHash, retry } = useSwapExecution(toolCallId, toolState, executionPayload)

  // Trigger particle burst on terminal success
  const prevTerminalRef = useRef(false)
  useEffect(() => {
    if (state.terminal && !state.error && !prevTerminalRef.current) {
      setShowParticles(true)
      const timer = setTimeout(() => setShowParticles(false), 1200)
      return () => clearTimeout(timer)
    }
    prevTerminalRef.current = state.terminal && !state.error
  }, [state.terminal, state.error])

  const routeCtx = swapOutput?.routeBuildContext
  const selectedQuote = swapOutput?.quoteOptions?.find(q => q.swapperId === selectedSwapperId)

  const selectedIsHighImpact =
    selectedQuote?.resultType === 'HIGH_IMPACT' || selectedQuote?.resultType === 'HIGH_IMPACT_FOR_CREATE_TX'

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
        buyAmountUsd: selectedQuote.outputAmountUsd != null ? String(selectedQuote.outputAmountUsd) : undefined,
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

  const quoteRouteList = swapOutput?.quoteOptions

  const sellUsd = swapOutput?.summary?.sellAsset?.valueUSD

  // Is the swap actively executing (between quote confirmation and terminal)?
  const isExecuting = Boolean(executionPayload && !state.terminal)

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

  const handleRefreshQuotes = useCallback(() => {
    setIsRefreshing(true)
    resetCountdown()
    setTimeout(() => setIsRefreshing(false), 800)
  }, [resetCountdown])

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

  const confirmBlocked =
    !selectedSwapperId || isBuilding || !wallet.isConnected || quotesExpired || (selectedIsHighImpact && !highImpactAcknowledged)

  return (
    <Execution.Root state={state} toolCallId={toolCallId}>
      <Execution.HistoricalGuard fallbackLabel="Swap">
        <TxStepCard.Root>
          {/* Success particles overlay */}
          <AnimatePresence>{showParticles && <SwapSuccessParticles />}</AnimatePresence>

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
                isActive={isExecuting}
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
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Live routes from Rango — select one to continue
                    </p>
                  </div>

                  {/* Quote expiry countdown with smooth gradient */}
                  <QuoteCountdown
                    secondsLeft={secondsLeft}
                    total={QUOTE_TTL_SECONDS}
                    expired={quotesExpired}
                    onRefresh={handleRefreshQuotes}
                    isRefreshing={isRefreshing}
                  />

                  {/* Route cards with staggered entrance */}
                  <ul className="space-y-3">
                    {quoteRouteList.map((opt, routeIndex) => {
                      const selected = opt.swapperId === selectedSwapperId
                      const highImpact =
                        opt.resultType === 'HIGH_IMPACT' || opt.resultType === 'HIGH_IMPACT_FOR_CREATE_TX'
                      const impactLabel = priceImpactVsBest(opt, routeIndex, quoteRouteList)
                      const stepCount = opt.pathStepCount ?? 1
                      return (
                        <motion.li
                          key={opt.swapperId}
                          initial={{ opacity: 0, y: 12, scale: 0.97, filter: 'blur(3px)' }}
                          animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                          transition={{
                            duration: 0.4,
                            delay: routeIndex * 0.08,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSwapperId(opt.swapperId)
                              setHighImpactAcknowledged(false)
                            }}
                            data-selected={selected}
                            className={cn(
                              'swap-route-card w-full rounded-2xl border text-left shadow-sm',
                              'bg-whiteAlpha-50/60 backdrop-blur-sm',
                              'hover:border-muted-foreground/25',
                              selected
                                ? 'border-sky-500/70 bg-sky-500/6 ring-2 ring-sky-500/25 dark:border-sky-400/60 dark:bg-sky-400/8'
                                : 'border-border/80'
                            )}
                          >
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border/40 px-3 py-2.5 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <Fuel className="size-3.5 shrink-0 opacity-70" aria-hidden />
                                {opt.feeUsd != null ? <Amount.Fiat value={String(opt.feeUsd)} /> : '—'}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Clock className="size-3.5 shrink-0 opacity-70" aria-hidden />
                                {formatRouteDuration(opt.estimatedTimeSeconds)}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Layers className="size-3.5 shrink-0 opacity-70" aria-hidden />
                                {stepCount} {stepCount === 1 ? 'step' : 'steps'}
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
                                  {sellUsd && (
                                    <div className="mt-0.5 text-xs text-muted-foreground">
                                      ~<Amount.Fiat value={sellUsd} />
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="relative flex min-w-18 shrink-0 flex-col items-center px-1">
                                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 border-t border-dashed border-muted-foreground/35" />
                                <div className="relative z-1 flex flex-col items-center gap-1 rounded-lg bg-whiteAlpha-50/80 px-1 backdrop-blur-sm">
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

                            {/* Minimum received row */}
                            {opt.outputAmountMin && opt.outputAmountMin !== opt.outputAmount && (
                              <div className="border-t border-border/40 px-3 py-1.5 text-[11px] text-muted-foreground flex justify-between">
                                <span>Min. received</span>
                                <span className="font-medium tabular-nums">
                                  <Amount.Crypto
                                    value={bnOrZero(opt.outputAmountMin)}
                                    symbol={routeCtx.buyAsset.symbol.toUpperCase()}
                                  />
                                </span>
                              </div>
                            )}
                          </button>
                        </motion.li>
                      )
                    })}
                  </ul>

                  {/* High-impact warning banner */}
                  <AnimatePresence>
                    {selectedIsHighImpact && !highImpactAcknowledged && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/8 px-3 py-2.5">
                          <ShieldAlert className="size-4 shrink-0 text-amber-500 mt-0.5" />
                          <div className="flex-1 space-y-1.5">
                            <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                              This route has high price impact. You may receive significantly less than the market rate.
                            </p>
                            <button
                              type="button"
                              onClick={() => setHighImpactAcknowledged(true)}
                              className="text-[11px] font-semibold text-amber-600 underline underline-offset-2 hover:text-amber-500 dark:text-amber-400"
                            >
                              I understand the risk — continue anyway
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

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
                    disabled={confirmBlocked}
                    onClick={() => void handleConfirmRoute()}
                  >
                    {isBuilding
                      ? 'Building transaction…'
                      : quotesExpired
                        ? 'Quotes expired — refresh above'
                        : 'Continue with selected route'}
                  </Button>
                </div>
              )}

              {/* Skeleton shimmer while quotes are loading */}
              {awaiting && routeCtx && (!quoteRouteList || quoteRouteList.length === 0) && (
                <div className="mb-5 space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Fetching live routes…
                  </p>
                  <RouteCardSkeleton />
                  <RouteCardSkeleton />
                </div>
              )}

              <TxStepCard.Details>
                <TxStepCard.DetailItem
                  label="Pair"
                  value={`${swapForDisplay.sellAsset.symbol.toUpperCase()} → ${swapForDisplay.buyAsset.symbol.toUpperCase()}`}
                />
                <TxStepCard.DetailItem
                  label="Sell Amount"
                  value={
                    <span className="inline-flex items-center gap-1.5">
                      <Amount.Crypto value={sellAmount} symbol={swapForDisplay.sellAsset.symbol.toUpperCase()} />
                      {sellUsd && (
                        <span className="text-muted-foreground">
                          (<Amount.Fiat value={sellUsd} />)
                        </span>
                      )}
                    </span>
                  }
                />
                <TxStepCard.DetailItem
                  label="Buy Amount"
                  value={
                    <span className="inline-flex items-center gap-1.5">
                      <Amount.Crypto value={buyAmount} symbol={swapForDisplay.buyAsset.symbol.toUpperCase()} />
                      {swapForDisplay.buyAmountUsd && (
                        <span className="text-muted-foreground">
                          (<Amount.Fiat value={swapForDisplay.buyAmountUsd} />)
                        </span>
                      )}
                    </span>
                  }
                />
                {selectedQuote?.outputAmountMin && (
                  <TxStepCard.DetailItem
                    label="Min. Received"
                    value={
                      <Amount.Crypto
                        value={bnOrZero(selectedQuote.outputAmountMin)}
                        symbol={swapForDisplay.buyAsset.symbol.toUpperCase()}
                      />
                    }
                  />
                )}
                <TxStepCard.DetailItem
                  label="Rate"
                  value={
                    <FlipRate
                      value={`1 ${swapForDisplay.sellAsset.symbol.toUpperCase()} = ${rate} ${swapForDisplay.buyAsset.symbol.toUpperCase()}`}
                    />
                  }
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
            <Execution.Step
              index={SWAP_STEPS.APPROVE}
              label={
                <span className="inline-flex items-center">
                  Approve token spending
                  {approvalTxHash && <CopyHash hash={approvalTxHash} />}
                </span>
              }
              connectorTop
              connectorBottom
            />
            <Execution.Step
              index={SWAP_STEPS.SWAP}
              label={
                <span className="inline-flex items-center">
                  Sign swap transaction
                  {swapTxHash && <CopyHash hash={swapTxHash} />}
                </span>
              }
              connectorTop
            />
          </Execution.Stepper>

          {/* Success: View in Explorer */}
          {state.terminal && !state.error && swapTxHash && networkName && (
            <div className="px-4 pb-4">
              <a
                href={getExplorerUrl(networkName, swapTxHash)}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'flex w-full items-center justify-center gap-2 rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-sm font-medium text-foreground',
                  'transition-all hover:bg-muted/60 hover:border-primary/25'
                )}
              >
                <ExternalLink className="size-3.5" />
                View in Explorer
              </a>
            </div>
          )}

          {/* Error footer with retry */}
          {state.error ? (
            <div className="px-4 pb-4 pt-2 space-y-2">
              <p className="text-sm font-medium text-red-500 truncate">
                Execution failed: {state.error}
              </p>
              {retry && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5 text-xs"
                  onClick={retry}
                >
                  <RefreshCw className="size-3" />
                  Retry swap
                </Button>
              )}
            </div>
          ) : (
            <Execution.ErrorFooter />
          )}
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
