import { ethChainId } from '@sola-ai/caip'
import { getViemClient } from '@sola-ai/utils'
import { normalize } from 'viem/ens'

/**
 * Resolves an ENS name to an address if the input looks like an ENS name.
 * Returns the original input unchanged if it's not an ENS name.
 */
export async function resolveEnsIfNeeded(recipient: string): Promise<{ address: string; ensName?: string }> {
  const trimmed = recipient.trim()
  if (!trimmed.endsWith('.eth')) return { address: trimmed }

  const client = getViemClient(ethChainId)
  const resolved = await client.getEnsAddress({ name: normalize(trimmed) })

  if (!resolved) {
    throw new Error(`Could not resolve ENS name "${trimmed}". The name may not be registered or has no address set.`)
  }

  return { address: resolved, ensName: trimmed }
}
