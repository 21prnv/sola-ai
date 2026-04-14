import { z } from 'zod'

export const saveContactSchema = z.object({
  name: z.string().describe('A friendly name for the contact (e.g. "Alice", "John")'),
  address: z.string().describe('The wallet address of the contact'),
  network: z.string().optional().describe('Optional network hint (e.g. "ethereum", "solana")'),
})

export type SaveContactInput = z.infer<typeof saveContactSchema>

export type SaveContactOutput = {
  name: string
  address: string
  network?: string
  action: 'saved'
}

export async function executeSaveContact(input: SaveContactInput): Promise<SaveContactOutput> {
  const name = input.name.trim()
  const address = input.address.trim()

  if (!name) throw new Error('Contact name cannot be empty.')
  if (!address) throw new Error('Contact address cannot be empty.')

  // Validate address format loosely (more specific validation happens at send time)
  if (!address.startsWith('0x') && address.length < 20) {
    throw new Error('Address does not look like a valid wallet address.')
  }

  return {
    name,
    address,
    network: input.network,
    action: 'saved',
  }
}

export const saveContactTool = {
  description: `Save a contact with a friendly name and wallet address. The contact can later be used in send transactions by name instead of address.

Example: { name: "Alice", address: "0x1234...abcd", network: "ethereum" }`,
  inputSchema: saveContactSchema,
  execute: executeSaveContact,
}
