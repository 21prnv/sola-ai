import { CalendarDays, ChartLine, TriangleAlert, TrendingDown, TrendingUp } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { cn } from '@/lib/utils'

import { ToolCard } from '../ui/ToolCard'

import { useToolStateRender } from './toolUIHelpers'
import type { ToolUIComponentProps } from './toolUIHelpers'

type HistoricalRange = {
  label: '1D' | '7D' | '1M' | '6M' | '1Y' | 'MAX'
  ms: number | null
}

type PricePoint = { timestamp: number; price: number }

type AssetHistoricalResult = {
  assetId: string
  symbol: string
  name: string
  dataPoints: PricePoint[]
  startPrice: number
  endPrice: number
  percentChange: number
}

type AssetHistoricalError = {
  searchTerm?: string
  assetId?: string
  error: string
}

const RANGES: HistoricalRange[] = [
  { label: '1D', ms: 24 * 60 * 60 * 1000 },
  { label: '7D', ms: 7 * 24 * 60 * 60 * 1000 },
  { label: '1M', ms: 30 * 24 * 60 * 60 * 1000 },
  { label: '6M', ms: 180 * 24 * 60 * 60 * 1000 },
  { label: '1Y', ms: 365 * 24 * 60 * 60 * 1000 },
  { label: 'MAX', ms: null },
]

function isAssetResult(result: AssetHistoricalResult | AssetHistoricalError): result is AssetHistoricalResult {
  return 'dataPoints' in result
}

function formatPrice(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: value < 1 ? 4 : 2,
    maximumFractionDigits: value < 1 ? 6 : 2,
  })
}

function linePath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0]!.x} ${points[0]!.y}`
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
}

export function HistoricalPricesUI({ toolPart }: ToolUIComponentProps<'getHistoricalPricesTool'>) {
  const { state, output } = toolPart
  const stateRender = useToolStateRender(state, {
    loading: 'Loading historical price data...',
    error: 'Failed to load historical price data',
  })
  if (stateRender) return stateRender

  const rawResults = output?.results ?? []
  const assets = rawResults.filter(isAssetResult)
  const errors = rawResults.filter((result): result is AssetHistoricalError => !isAssetResult(result))

  if (assets.length === 0) {
    return (
      <ToolCard.Root defaultOpen className="border-destructive/40">
        <ToolCard.Header>
          <ToolCard.HeaderRow>
            <div className="flex items-center gap-2 text-destructive">
              <TriangleAlert className="size-4" />
              <span className="font-medium">Historical prices unavailable</span>
            </div>
          </ToolCard.HeaderRow>
        </ToolCard.Header>
        {errors.length > 0 && (
          <ToolCard.Content>
            <ToolCard.Details>
              {errors.map((err, index) => (
                <div
                  key={`${err.assetId ?? err.searchTerm ?? 'unknown'}-${index}`}
                  className="text-sm text-muted-foreground"
                >
                  {err.error}
                </div>
              ))}
            </ToolCard.Details>
          </ToolCard.Content>
        )}
      </ToolCard.Root>
    )
  }

  return (
    <div className="space-y-3">
      {assets.map(asset => (
        <HistoricalAssetCard key={asset.assetId} asset={asset} />
      ))}
      {errors.length > 0 && (
        <ToolCard.Root defaultOpen={false} className="border-destructive/30">
          <ToolCard.Header>
            <ToolCard.HeaderRow>
              <div className="flex items-center gap-2 text-destructive">
                <TriangleAlert className="size-4" />
                <span className="font-medium">Some assets could not be loaded</span>
              </div>
            </ToolCard.HeaderRow>
          </ToolCard.Header>
          <ToolCard.Content>
            <ToolCard.Details>
              {errors.map((err, index) => (
                <div
                  key={`${err.assetId ?? err.searchTerm ?? 'unknown'}-${index}`}
                  className="text-sm text-muted-foreground"
                >
                  {err.error}
                </div>
              ))}
            </ToolCard.Details>
          </ToolCard.Content>
        </ToolCard.Root>
      )}
    </div>
  )
}

function HistoricalAssetCard({ asset }: { asset: AssetHistoricalResult }) {
  const [activeRange, setActiveRange] = useState<HistoricalRange['label']>('MAX')
  const sortedData = useMemo(() => [...asset.dataPoints].sort((a, b) => a.timestamp - b.timestamp), [asset.dataPoints])

  const latestTimestampMs = sortedData[sortedData.length - 1] ? sortedData[sortedData.length - 1]!.timestamp * 1000 : 0

  const rangeAvailability = useMemo(() => {
    return RANGES.map(range => {
      if (range.ms === null) return { ...range, available: sortedData.length >= 2 }
      const threshold = latestTimestampMs - range.ms
      const points = sortedData.filter(point => point.timestamp * 1000 >= threshold)
      return { ...range, available: points.length >= 2 }
    })
  }, [latestTimestampMs, sortedData])

  useEffect(() => {
    const current = rangeAvailability.find(range => range.label === activeRange)
    if (current?.available) return
    const fallback = rangeAvailability.find(range => range.available)
    setActiveRange(fallback?.label ?? 'MAX')
  }, [activeRange, rangeAvailability])

  const activeRangeMs = rangeAvailability.find(range => range.label === activeRange)?.ms ?? null

  const chartData = useMemo(() => {
    if (activeRangeMs === null) return sortedData
    const threshold = latestTimestampMs - activeRangeMs
    const filtered = sortedData.filter(point => point.timestamp * 1000 >= threshold)
    return filtered.length >= 2 ? filtered : sortedData
  }, [activeRangeMs, latestTimestampMs, sortedData])

  const chartMetrics = useMemo(() => {
    const prices = chartData.map(point => point.price)
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    const pad = (max - min) * 0.08 || max * 0.02 || 1
    const yMin = min - pad
    const yMax = max + pad
    return { min, max, yMin, yMax }
  }, [chartData])

  const currentPrice = chartData[chartData.length - 1]?.price ?? asset.endPrice
  const startPrice = chartData[0]?.price ?? asset.startPrice
  const priceDelta = currentPrice - startPrice
  const percentDelta = startPrice !== 0 ? (priceDelta / startPrice) * 100 : 0
  const positive = percentDelta >= 0

  const width = 760
  const height = 280
  const topPad = 10
  const bottomPad = 28
  const leftPad = 10
  const rightPad = 58
  const innerWidth = width - leftPad - rightPad
  const innerHeight = height - topPad - bottomPad

  const points = chartData.map((point, index) => {
    const x = leftPad + (index / Math.max(chartData.length - 1, 1)) * innerWidth
    const y =
      topPad +
      ((chartMetrics.yMax - point.price) / Math.max(chartMetrics.yMax - chartMetrics.yMin, 0.000001)) * innerHeight
    return { x, y, raw: point }
  })

  const mainPath = linePath(points)
  const areaPath = points.length
    ? `${mainPath} L ${points[points.length - 1]!.x} ${height - bottomPad} L ${points[0]!.x} ${height - bottomPad} Z`
    : ''

  const yTicks = 5
  const gridValues = Array.from({ length: yTicks }, (_, index) => {
    const ratio = index / Math.max(yTicks - 1, 1)
    const value = chartMetrics.yMax - ratio * (chartMetrics.yMax - chartMetrics.yMin)
    const y = topPad + ratio * innerHeight
    return { value, y }
  })

  const rangeStart = new Date((chartData[0]?.timestamp ?? asset.dataPoints[0]?.timestamp ?? 0) * 1000)
  const rangeEnd = new Date(
    (chartData[chartData.length - 1]?.timestamp ?? asset.dataPoints[asset.dataPoints.length - 1]?.timestamp ?? 0) * 1000
  )

  return (
    <ToolCard.Root
      defaultOpen
      className="border-border/70 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),rgba(255,255,255,0.02)_35%,rgba(0,0,0,0.25)_100%)]"
    >
      <ToolCard.Header className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground">
              {asset.name} ({asset.symbol.toUpperCase()})
            </div>
            <div className="mt-1 text-4xl font-semibold tracking-tight">${formatPrice(currentPrice)}</div>
            <div
              className={cn(
                'mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm font-medium',
                positive ? 'bg-green-500/12 text-green-500' : 'bg-red-500/12 text-red-500'
              )}
            >
              {positive ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
              {`${positive ? '+' : ''}$${formatPrice(Math.abs(priceDelta))} (${percentDelta.toFixed(2)}%)`}
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarDays className="size-3.5" />
            <span>{`${rangeStart.toLocaleDateString()} - ${rangeEnd.toLocaleDateString()}`}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {rangeAvailability.map(range => (
            <button
              key={range.label}
              type="button"
              disabled={!range.available}
              onClick={() => setActiveRange(range.label)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                activeRange === range.label
                  ? 'border-foreground/20 bg-foreground/10 text-foreground'
                  : 'border-transparent bg-muted/40 text-muted-foreground hover:bg-muted/70',
                !range.available && 'cursor-not-allowed opacity-40'
              )}
            >
              {range.label}
            </button>
          ))}
        </div>
      </ToolCard.Header>
      <ToolCard.Content>
        <ToolCard.Details className="space-y-4">
          <div className="rounded-xl border border-border/60 bg-black/30 p-3">
            <div className="relative">
              <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
                <defs>
                  <linearGradient id={`area-gradient-${asset.assetId}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={positive ? '#22c55e' : '#ef4444'} stopOpacity="0.35" />
                    <stop offset="100%" stopColor={positive ? '#22c55e' : '#ef4444'} stopOpacity="0.03" />
                  </linearGradient>
                </defs>
                {gridValues.map(grid => (
                  <g key={grid.y}>
                    <line
                      x1={leftPad}
                      x2={width - rightPad}
                      y1={grid.y}
                      y2={grid.y}
                      stroke="currentColor"
                      className="text-white/15"
                      strokeDasharray="4 6"
                    />
                    <text x={width - rightPad + 8} y={grid.y + 4} className="fill-muted-foreground text-[11px]">
                      {formatPrice(grid.value)}
                    </text>
                  </g>
                ))}
                {areaPath ? <path d={areaPath} fill={`url(#area-gradient-${asset.assetId})`} /> : null}
                {mainPath ? (
                  <path
                    d={mainPath}
                    fill="none"
                    stroke={positive ? '#22c55e' : '#ef4444'}
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : null}
              </svg>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <StatItem label="Open" value={`$${formatPrice(startPrice)}`} />
            <StatItem label="Close" value={`$${formatPrice(currentPrice)}`} />
            <StatItem label="Range Low" value={`$${formatPrice(chartMetrics.min)}`} />
            <StatItem label="Range High" value={`$${formatPrice(chartMetrics.max)}`} />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ChartLine className="size-3.5" />
            <span>Historical data from CoinGecko</span>
          </div>
        </ToolCard.Details>
      </ToolCard.Content>
    </ToolCard.Root>
  )
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  )
}
