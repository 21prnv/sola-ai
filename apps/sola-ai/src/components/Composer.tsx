import { ArrowUp, MessageSquareOff, Square } from 'lucide-react'
import type { FormEvent, KeyboardEvent } from 'react'
import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

import { useChatContext } from '../providers/ChatProvider'

import { Button } from './ui/Button'

const TEXTAREA_MAX_HEIGHT = 240

export function Composer() {
  const { input, handleInputChange, handleSubmit, isLoading, isAtMessageLimit, stop } = useChatContext()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, TEXTAREA_MAX_HEIGHT)}px`
  }, [input])

  if (isAtMessageLimit) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-muted/50 p-4 text-center">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <MessageSquareOff className="h-4 w-4" />
          Conversation limit reached
        </div>
        <p className="text-xs text-muted-foreground">
          This conversation has reached the maximum message limit. Start a new conversation to continue.
        </p>
        <Button asChild variant="default" size="sm">
          <Link to="/chats">Start new conversation</Link>
        </Button>
      </div>
    )
  }

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    handleSubmit(e)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!input.trim() || isLoading) return
      const form = e.currentTarget.form
      if (form) {
        form.requestSubmit()
      }
    }
  }

  return (
    <form onSubmit={onSubmit} className="w-full">
      <div className="overflow-hidden rounded-3xl border border-foreground/10 bg-muted/50 shadow-xs backdrop-blur-md">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={onKeyDown}
          placeholder="Ask me anything..."
          rows={1}
          className="text-foreground min-h-[64px] w-full resize-none border-none bg-transparent px-6 py-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
          style={{ maxHeight: TEXTAREA_MAX_HEIGHT }}
          autoFocus
          autoComplete="new-password"
          data-form-type="other"
          data-lpignore="true"
          data-1p-ignore="true"
        />
        <div className="flex items-center justify-end gap-2 px-3 pb-3">
          <Button
            type={isLoading ? 'button' : 'submit'}
            onClick={isLoading ? stop : undefined}
            variant="default"
            size="icon"
            className="h-8 w-8 shrink-0 rounded-full"
            disabled={!isLoading && !input.trim()}
            aria-label={isLoading ? 'Stop' : 'Send message'}
          >
            {isLoading ? <Square className="size-5 fill-current" /> : <ArrowUp className="size-5" />}
          </Button>
        </div>
      </div>
    </form>
  )
}
