import { ChevronRight, Circle, List, X } from 'lucide-react'
import type { ReactNode } from 'react'

import { formatCryptoAmount } from '@/lib/number'
import { StepStatus } from '@/lib/stepUtils'
import { cn } from '@/lib/utils'

import { Skeleton } from './Skeleton'
import { ToolCard } from './ToolCard'

const TxStepCardStepper = ({
  children,
  className,
  completedCount,
  totalCount,
}: {
  children: ReactNode
  className?: string
  completedCount?: number
  totalCount?: number
}) => {
  return (
    <div className={cn('pt-4 border-t border-border px-4 pb-4', className)}>
      {completedCount !== undefined && totalCount !== undefined && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-normal mb-4">
          <List className="w-4 h-4" />
          <span>
            {completedCount} of {totalCount} complete
          </span>
        </div>
      )}
      <div>{children}</div>
    </div>
  )
}

const TxStepCardStep = ({
  status,
  children,
  subtitle,
  className,
  connectorTop = false,
  connectorBottom = false,
}: {
  status: StepStatus
  children: ReactNode
  subtitle?: ReactNode
  className?: string
  connectorTop?: boolean
  connectorBottom?: boolean
}) => {
  const getStatusStyles = () => {
    switch (status) {
      case StepStatus.COMPLETE:
        return 'text-green-500'
      case StepStatus.IN_PROGRESS:
        return 'text-foreground'
      case StepStatus.FAILED:
        return 'text-destructive'
      case StepStatus.NOT_STARTED:
      case StepStatus.SKIPPED:
      default:
        return 'text-muted-foreground'
    }
  }

  const iconContent = (() => {
    switch (status) {
      case StepStatus.COMPLETE:
        return (
          <>
            <div className="absolute inset-0 rounded-full bg-green-500 checkmark-circle" />
            <svg className="w-3 h-3 relative z-10" viewBox="0 0 12 12" fill="none">
              <path
                className="checkmark-path"
                d="M2.5 6.5L5 9L9.5 3.5"
                stroke="white"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </>
        )
      case StepStatus.IN_PROGRESS:
        return (
          <div className="step-glow-pulse rounded-full">
            <Circle className="w-5 h-5 text-purple-500" strokeWidth={2} fill="none" />
          </div>
        )
      case StepStatus.FAILED:
        return (
          <>
            <Circle className="w-5 h-5 text-destructive" strokeWidth={2} />
            <X className="w-3 h-3 text-destructive absolute" strokeWidth={3} />
          </>
        )
      case StepStatus.SKIPPED:
        return (
          <>
            <Circle className="w-5 h-5 text-muted-foreground/40" strokeWidth={2} fill="none" />
            <div className="absolute w-2 h-0.5 bg-muted-foreground/60" />
          </>
        )
      case StepStatus.NOT_STARTED:
      default:
        return <Circle className="w-5 h-5 text-muted-foreground/40" strokeWidth={2} fill="none" />
    }
  })()

  const hasActiveSubtitle = subtitle && status === StepStatus.IN_PROGRESS

  return (
    <div
      className={cn(
        'relative -mx-2 flex items-center rounded-md px-2 transition-colors duration-300',
        hasActiveSubtitle ? 'min-h-10 py-1.5' : 'h-10',
        status === StepStatus.IN_PROGRESS && 'bg-muted shadow-[0_0_0_1px_var(--color-border)]'
      )}
    >
      <div className={cn('flex items-center gap-2', getStatusStyles(), className)}>
        <div className="relative shrink-0 z-10">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'h-2.5 w-0.5 bg-border',
                (!connectorTop || status === StepStatus.IN_PROGRESS) && 'opacity-0'
              )}
            />
            <div className="h-5 w-5 relative flex items-center justify-center">{iconContent}</div>
            <div
              className={cn(
                'h-2.5 w-0.5 bg-border',
                (!connectorBottom || status === StepStatus.IN_PROGRESS) && 'opacity-0'
              )}
            />
          </div>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-normal">{children}</span>
          {hasActiveSubtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
        </div>
      </div>
    </div>
  )
}

const TxStepCardSwapPair = ({
  fromSymbol,
  toSymbol,
  isLoading,
  isActive,
  className,
}: {
  fromSymbol?: string
  toSymbol?: string
  isLoading?: boolean
  isActive?: boolean
  className?: string
}) => {
  if (isLoading) return <Skeleton className="h-7 w-40" />
  if (!fromSymbol || !toSymbol) return <div className="text-lg font-semibold text-muted-foreground">—</div>

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span className="text-xl font-bold">{fromSymbol}</span>
      <div
        className={cn(
          'w-6 h-6 shrink-0 rounded-full bg-muted flex items-center justify-center',
          isActive && 'bg-primary/15'
        )}
      >
        <ChevronRight className={cn('w-4 h-4 text-muted-foreground', isActive && 'swap-arrow-active text-primary')} />
      </div>
      <span className="text-xl font-bold">{toSymbol}</span>
    </div>
  )
}

const TxStepCardAmount = ({
  value,
  symbol,
  isLoading,
  prefix,
  className,
}: {
  value?: string
  symbol?: string
  isLoading?: boolean
  prefix?: string
  className?: string
}) => {
  if (isLoading) return <Skeleton className="h-7 w-32" />
  if (value === undefined) return <div className="text-lg font-semibold text-muted-foreground">—</div>

  const formatted = formatCryptoAmount(value, { symbol })

  return (
    <span className={cn('text-xl font-bold text-green-500 tabular-nums', className)}>
      {prefix}
      {formatted}
    </span>
  )
}

export const TxStepCard = {
  Root: ToolCard.Root,
  Header: ToolCard.Header,
  HeaderRow: ToolCard.HeaderRow,
  Content: ToolCard.Content,
  Details: ToolCard.Details,
  DetailItem: ToolCard.DetailItem,
  Stepper: TxStepCardStepper,
  Step: TxStepCardStep,
  SwapPair: TxStepCardSwapPair,
  Amount: TxStepCardAmount,
}
