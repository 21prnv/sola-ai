import { z } from 'zod'

import type { WalletContext } from '../utils/walletContextSimple'

export const listContactsSchema = z.object({
  search: z.string().optional().describe('Optional search query to filter contacts by name'),
})

export type ListContactsInput = z.infer<typeof listContactsSchema>

export type ContactEntry = {
  name: string
  address: string
  network?: string
}

export type ListContactsOutput = {
  contacts: ContactEntry[]
  total: number
}

export async function executeListContacts(
  input: ListContactsInput,
  walletContext?: WalletContext
): Promise<ListContactsOutput> {
  const allContacts = walletContext?.contacts ?? []

  let filtered = allContacts
  if (input.search) {
    const query = input.search.toLowerCase()
    filtered = allContacts.filter(c => c.name.toLowerCase().includes(query) || c.address.toLowerCase().includes(query))
  }

  return {
    contacts: filtered.map(c => ({
      name: c.name,
      address: c.address,
      network: c.network,
    })),
    total: filtered.length,
  }
}

export const listContactsTool = {
  description: `List saved contacts, optionally filtered by a search query. Returns contact names and addresses.

Example: { search: "alice" }`,
  inputSchema: listContactsSchema,
  execute: executeListContacts,
}
