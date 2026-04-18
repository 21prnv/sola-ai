import type { DynamicToolUIPart } from 'ai'
import type { ReactNode } from 'react'

import type { ToolName, ToolOutputMap } from '@/types/toolOutput'

import { StatusText } from '../ui/StatusText'

type TypedToolPart<T extends ToolName> = Omit<DynamicToolUIPart, 'output'> & {
  output?: ToolOutputMap[T] | undefined
}

export type ToolUIComponentProps<T extends ToolName = ToolName> = {
  toolPart: TypedToolPart<T>
}

export type ToolRendererProps = {
  toolPart: DynamicToolUIPart
}

const EXECUTED_KEY = 'polymarket_executed_tools'

export function markToolExecuted(toolCallId: string): void {
  try {
    const set = JSON.parse(sessionStorage.getItem(EXECUTED_KEY) ?? '[]') as string[]
    if (!set.includes(toolCallId)) set.push(toolCallId)
    sessionStorage.setItem(EXECUTED_KEY, JSON.stringify(set))
  } catch {
    /* ignore */
  }
}

export function wasToolExecuted(toolCallId: string): boolean {
  try {
    const set = JSON.parse(sessionStorage.getItem(EXECUTED_KEY) ?? '[]') as string[]
    return set.includes(toolCallId)
  } catch {
    return false
  }
}

export function useToolStateRender(
  state: DynamicToolUIPart['state'],
  messages: {
    loading: ReactNode
    error: ReactNode
    success?: ReactNode
  }
) {
  if (state === 'input-streaming' || state === 'input-available') {
    return <StatusText.Loading>{messages.loading}</StatusText.Loading>
  }

  if (state === 'output-error') {
    return <StatusText.Error>{messages.error}</StatusText.Error>
  }

  if (messages.success) {
    return <StatusText.Success>{messages.success}</StatusText.Success>
  }

  return null
}
