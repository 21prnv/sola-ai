import type { ListContactsOutput } from '@sola-ai/server'
import { Users } from 'lucide-react'

import { StatusText } from '../ui/StatusText'
import { ToolCard } from '../ui/ToolCard'

import { useToolStateRender } from './toolUIHelpers'
import type { ToolUIComponentProps } from './toolUIHelpers'

export function ListContactsUI({ toolPart }: ToolUIComponentProps<'listContactsTool'>) {
  const { state, output, errorText } = toolPart
  const listOutput = output as ListContactsOutput | undefined

  const stateRender = useToolStateRender(state, {
    loading: 'Loading contacts...',
    error: null,
  })

  if (stateRender) return stateRender

  if (state === 'output-error') {
    const message = typeof errorText === 'string' ? errorText : 'Failed to load contacts'
    return <StatusText.Error>{message}</StatusText.Error>
  }

  if (!listOutput) return null

  if (listOutput.contacts.length === 0) {
    return (
      <ToolCard.Root>
        <ToolCard.Content>
          <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            No contacts saved yet
          </div>
        </ToolCard.Content>
      </ToolCard.Root>
    )
  }

  return (
    <ToolCard.Root>
      <ToolCard.Content>
        <div className="text-sm font-medium mb-2 flex items-center gap-2">
          <Users className="w-4 h-4" />
          Contacts ({listOutput.total})
        </div>
        <div className="space-y-2">
          {listOutput.contacts.map(contact => (
            <div
              key={contact.name}
              className="flex items-center justify-between py-2 px-3 rounded-lg bg-whiteAlpha-50 border border-whiteAlpha-100"
            >
              <div>
                <div className="text-sm font-medium">{contact.name}</div>
                <div className="text-xs text-muted-foreground font-mono break-all">{contact.address}</div>
              </div>
              {contact.network && <div className="text-xs text-muted-foreground capitalize">{contact.network}</div>}
            </div>
          ))}
        </div>
      </ToolCard.Content>
    </ToolCard.Root>
  )
}
