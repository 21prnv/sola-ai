import { z } from 'zod'

/** EVM networks where Safe vault tools operate (chain IDs 1, 100, 42161). */
export const vaultSupportedNetworkSchema = z.enum(['ethereum', 'gnosis', 'arbitrum'])

export const NETWORK_TO_CHAIN_ID: Record<string, number> = {
  ethereum: 1,
  gnosis: 100,
  arbitrum: 42161,
}

export const CHAIN_ID_TO_NETWORK: Record<number, string> = {
  1: 'ethereum',
  100: 'gnosis',
  42161: 'arbitrum',
}

export const VAULT_EVM_CHAIN_IDS = [1, 100, 42161] as const
