import type { DynamicToolUIPart, UIMessage } from 'ai'
import { getToolOrDynamicToolName, isToolOrDynamicToolUIPart } from 'ai'
import { memo, useMemo } from 'react'

import { Markdown } from './Markdown'
import { getToolUIComponent } from './toolUIRegistry'
import { CopyButton } from './ui/CopyButton'

interface AssistantMessageProps {
  message: UIMessage
  animated?: boolean
}

export const AssistantMessage = memo(function AssistantMessage({ message, animated = false }: AssistantMessageProps) {
  const textContent = useMemo(
    () =>
      message.parts
        .filter(p => p.type === 'text')
        .map(p => p.text)
        .join('\n'),
    [message.parts]
  )

  const lastTextIndex = useMemo(() => {
    for (let i = message.parts.length - 1; i >= 0; i--) {
      if (message.parts[i]?.type === 'text') return i
    }
    return -1
  }, [message.parts])

  const renderedParts = useMemo(
    () =>
      message.parts.map((part, index) => {
        const partMotionStyle = { animationDelay: `${index * 36}ms` }

        if (part.type === 'text') {
          if (index === lastTextIndex && textContent) {
            return (
              <div
                key={`text-${index}`}
                className="message-part-enter [&>div]:contents [&>div>*:last-child]:inline"
                style={partMotionStyle}
              >
                <Markdown animated={animated}>{part.text}</Markdown>
                <CopyButton
                  value={textContent}
                  className="inline-flex align-middle ml-1 opacity-0 transition-opacity group-hover/msg:opacity-100"
                />
              </div>
            )
          }
          return (
            <div key={`text-${index}`} className="message-part-enter" style={partMotionStyle}>
              <Markdown animated={animated}>{part.text}</Markdown>
            </div>
          )
        }

        if (isToolOrDynamicToolUIPart(part)) {
          const toolCallId = 'toolCallId' in part ? part.toolCallId : `tool-${index}`
          const toolName = getToolOrDynamicToolName(part)
          const ToolUIComponent = getToolUIComponent(toolName)

          if (!ToolUIComponent) {
            return null
          }

          return (
            <div key={`tool-${toolCallId}`} className="message-part-enter" style={partMotionStyle}>
              <ToolUIComponent toolPart={part as DynamicToolUIPart} />
            </div>
          )
        }

        return null
      }),
    [message.parts, lastTextIndex, textContent, animated]
  )

  return (
    <div className="group/msg message-enter flex justify-start">
      <div className="max-w-[80%] space-y-2">{renderedParts}</div>
    </div>
  )
})
