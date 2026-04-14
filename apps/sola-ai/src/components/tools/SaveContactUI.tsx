import type { SaveContactOutput } from '@sola-ai/server'
import { Check } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { useContactStore } from '@/stores/contactStore'

import { StatusText } from '../ui/StatusText'
import { ToolCard } from '../ui/ToolCard'

import { useToolStateRender } from './toolUIHelpers'
import type { ToolUIComponentProps } from './toolUIHelpers'

export function SaveContactUI({ toolPart }: ToolUIComponentProps<'saveContactTool'>) {
  const { state, output, errorText } = toolPart
  const contactOutput = output as SaveContactOutput | undefined
  const addContact = useContactStore(s => s.addContact)
  const savedRef = useRef(false)

  const stateRender = useToolStateRender(state, {
    loading: 'Saving contact...',
    error: null,
  })

  // Persist to contact store when output is available
  useEffect(() => {
    if (contactOutput && !savedRef.current) {
      savedRef.current = true
      addContact({
        name: contactOutput.name,
        address: contactOutput.address,
        network: contactOutput.network,
      })
    }
  }, [contactOutput, addContact])

  if (stateRender) return stateRender

  if (state === 'output-error') {
    const message = typeof errorText === 'string' ? errorText : 'Failed to save contact'
    return <StatusText.Error>{message}</StatusText.Error>
  }

  if (!contactOutput) return null

  return (
    <ToolCard.Root>
      <ToolCard.Content>
        <div className="flex items-center gap-2 py-1">
          <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
          <div>
            <div className="text-sm font-medium">Contact saved: {contactOutput.name}</div>
            <div className="text-xs text-muted-foreground font-mono break-all">{contactOutput.address}</div>
            {contactOutput.network && (
              <div className="text-xs text-muted-foreground capitalize">{contactOutput.network}</div>
            )}
          </div>
        </div>
      </ToolCard.Content>
    </ToolCard.Root>
  )
}
