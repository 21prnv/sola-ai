import { AlertTriangle } from 'lucide-react'
import { motion } from 'framer-motion'
import { useCallback, useMemo, useRef } from 'react'
import { Virtuoso } from 'react-virtuoso'

import { useStreamPauseDetector } from '../hooks/useStreamPauseDetector'
import { useChatContext } from '../providers/ChatProvider'
import type { WatchlistToken } from '../stores/watchlistStore'

import { AssistantMessage } from './AssistantMessage'
import { Composer } from './Composer'
import { LoadingIndicator } from './LoadingIndicator'
import { PromptMarquee } from './PromptMarquee'
import { WatchlistStrip } from './WatchlistStrip'
import { UserMessage } from './UserMessage'
import { cn } from '@/lib/utils'

export function Chat() {
  const { messages, sendMessage, status, error } = useChatContext()
  const shouldAutoScrollRef = useRef(true)

  const lastMessageContent = useMemo(() => {
    const assistantMessages = messages.filter(m => m.role === 'assistant')
    const lastAssistantMessage = assistantMessages[assistantMessages.length - 1]
    if (!lastAssistantMessage) return undefined
    return lastAssistantMessage.parts
      .filter(part => part.type === 'text')
      .map(part => (part as { type: 'text'; text: string }).text)
      .join('')
  }, [messages])

  const isStreaming = status === 'submitted' || status === 'streaming'
  const isPaused = useStreamPauseDetector(isStreaming, lastMessageContent)

  const lastAssistantIndex = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]?.role === 'assistant') return i
    }
    return -1
  }, [messages])

  const handleSuggestionClick = (suggestion: string) => {
    void sendMessage({ text: suggestion })
  }

  const handleWatchlistClick = (token: WatchlistToken) => {
    void sendMessage({
      text: `Show me ${token.symbol} market details and the latest spot price.`,
    })
  }

  const isEmpty = messages.length === 0

  const items = useMemo(() => {
    const result: Array<{ type: 'message'; index: number } | { type: 'loading' } | { type: 'error' }> = messages.map(
      (_, index) => ({ type: 'message' as const, index })
    )
    if (isPaused) result.push({ type: 'loading' as const })
    if (error && status === 'error') result.push({ type: 'error' as const })
    return result
  }, [messages, isPaused, error, status])

  const itemContent = useCallback(
    (_index: number, item: (typeof items)[number]) => {
      if (item.type === 'loading') {
        return (
          <div className="mx-auto max-w-2xl px-4 py-2">
            <LoadingIndicator />
          </div>
        )
      }

      if (item.type === 'error') {
        return (
          <div className="mx-auto max-w-2xl px-4 py-2">
            <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
              <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
              <div className="flex flex-col gap-1">
                <div className="font-medium text-red-800 dark:text-red-200">Something went wrong</div>
                <div className="text-sm text-red-600 dark:text-red-400">
                  The service is temporarily unavailable. Please try again.
                </div>
              </div>
            </div>
          </div>
        )
      }

      const message = messages[item.index]
      if (!message) return null

      return (
        <div className="mx-auto max-w-2xl px-4 py-2">
          {message.role === 'user' && <UserMessage message={message} />}
          {message.role === 'assistant' && (
            <AssistantMessage message={message} animated={isStreaming && item.index === lastAssistantIndex} />
          )}
        </div>
      )
    },
    [messages, isStreaming, lastAssistantIndex]
  )

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      {/* Messages viewport */}
      <div className="min-h-0 flex-1 overflow-hidden">
        {isEmpty ? (
          <div className="h-full" aria-hidden />
        ) : (
          <Virtuoso
            data={items}
            itemContent={itemContent}
            initialTopMostItemIndex={items.length - 1}
            followOutput={isActive => {
              if (!shouldAutoScrollRef.current) return false
              return isActive ? (isStreaming ? 'smooth' : 'auto') : false
            }}
            atBottomStateChange={atBottom => {
              shouldAutoScrollRef.current = atBottom
            }}
            atBottomThreshold={100}
            style={{ height: '100%' }}
            components={{
              Footer: () => <div className="h-40 shrink-0" aria-hidden />,
            }}
          />
        )}
      </div>

      {/* Composer dock: matches chat multi-modal-input — floats from ~25vh to bottom after first message */}
      <motion.div
        layoutId="sola-multi-modal-input"
        transition={{ type: 'spring', stiffness: 1000, damping: 40 }}
        className={cn(
          'absolute right-0 left-0 z-10 flex flex-col gap-4 px-4 pt-4',
          isEmpty ? 'top-[25vh] bottom-0' : 'bottom-0'
        )}
      >
        {isEmpty && (
          <motion.div
            className="mx-auto w-full max-w-3xl font-serif"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl text-foreground tracking-tight">How can I help you today?</h2>
          </motion.div>
        )}
        {isEmpty && (
          <div className="mx-auto w-full max-w-3xl">
            <PromptMarquee onSelect={handleSuggestionClick} />
          </div>
        )}
        <WatchlistStrip onTokenClick={handleWatchlistClick} />
        <div className="mx-auto w-full max-w-3xl pb-4">
          <Composer />
        </div>
      </motion.div>
    </div>
  )
}
