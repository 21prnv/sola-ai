import { describe, expect, test } from 'bun:test'

import { CHAIN_ID_TO_NETWORK, NETWORK_TO_CHAIN_ID, vaultSupportedNetworkSchema } from '../vaultNetworks'

describe('vaultSupportedNetworkSchema', () => {
  test('accepts supported networks', () => {
    for (const n of ['ethereum', 'gnosis', 'arbitrum'] as const) {
      expect(vaultSupportedNetworkSchema.safeParse(n).success).toBe(true)
    }
  })

  test('rejects unsupported networks', () => {
    expect(vaultSupportedNetworkSchema.safeParse('solana').success).toBe(false)
    expect(vaultSupportedNetworkSchema.safeParse('polygon').success).toBe(false)
  })
})

describe('NETWORK_TO_CHAIN_ID / CHAIN_ID_TO_NETWORK', () => {
  test('round-trips for vault chains', () => {
    for (const [network, chainId] of Object.entries(NETWORK_TO_CHAIN_ID)) {
      expect(CHAIN_ID_TO_NETWORK[chainId]).toBe(network)
    }
  })
})
