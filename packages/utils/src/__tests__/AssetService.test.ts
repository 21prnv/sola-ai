import type { Network } from '@sola-ai/types'
import { describe, test, expect, beforeAll } from 'bun:test'

import { AssetService } from '../AssetService'

describe('AssetService search scoring', () => {
  beforeAll(async () => {
    await AssetService.initialize()
  }, 30_000)

  const cases: Array<{
    name: string
    search: string
    network?: Network
    expect: { symbolOrName?: string; assetIdPrefix?: string; assetId?: string }
  }> = [
    // The original bug — USDC on Gnosis must beat Morpho/Silo vault tokens
    {
      name: 'USDC on Gnosis',
      search: 'USDC',
      network: 'gnosis',
      expect: { assetId: 'eip155:100/erc20:0xddafbb505ad214d7b80b1f830fccc89b60fb7a83' },
    },
    {
      name: 'USDC on Ethereum',
      search: 'USDC',
      network: 'ethereum',
      expect: { symbolOrName: 'USDC' },
    },
    {
      name: 'USDC on Arbitrum',
      search: 'USDC',
      network: 'arbitrum',
      expect: { symbolOrName: 'USDC' },
    },
    {
      name: 'USDT on Gnosis',
      search: 'USDT',
      network: 'gnosis',
      expect: { symbolOrName: 'USDT' },
    },
    {
      name: 'USDT on Ethereum',
      search: 'USDT',
      network: 'ethereum',
      expect: { symbolOrName: 'USDT' },
    },
    {
      name: 'LINK on Ethereum',
      search: 'LINK',
      network: 'ethereum',
      expect: { assetId: 'eip155:1/erc20:0x514910771af9ca656af840dff83e8264ecf986ca' },
    },
    {
      name: 'LINK on Gnosis',
      search: 'LINK',
      network: 'gnosis',
      expect: { assetId: 'eip155:100/erc20:0xe2e73a1c69ecf83f464efce6a5be353a37ca09b2' },
    },
    {
      name: 'LINK on Arbitrum',
      search: 'LINK',
      network: 'arbitrum',
      expect: { assetId: 'eip155:42161/erc20:0xf97f4df75117a78c1a5a0dbb814af92458539fb4' },
    },
    {
      name: 'WETH on Ethereum',
      search: 'WETH',
      network: 'ethereum',
      expect: { symbolOrName: 'WETH' },
    },
    {
      name: 'WETH on Gnosis',
      search: 'WETH',
      network: 'gnosis',
      expect: { symbolOrName: 'WETH' },
    },
    {
      name: 'WBTC on Ethereum',
      search: 'WBTC',
      network: 'ethereum',
      expect: { symbolOrName: 'WBTC' },
    },
    {
      name: 'DAI on Ethereum',
      search: 'DAI',
      network: 'ethereum',
      expect: { symbolOrName: 'DAI' },
    },
    {
      name: 'DAI on Gnosis',
      search: 'DAI',
      network: 'gnosis',
      expect: { symbolOrName: 'DAI' },
    },
    {
      name: 'GNO on Gnosis',
      search: 'GNO',
      network: 'gnosis',
      expect: { symbolOrName: 'GNO' },
    },
    {
      name: 'ETH on Ethereum (native)',
      search: 'ETH',
      network: 'ethereum',
      expect: { assetIdPrefix: 'eip155:1/slip44:60' },
    },
    {
      name: 'POL on Polygon (native)',
      search: 'POL',
      network: 'polygon',
      expect: { assetIdPrefix: 'eip155:137/slip44:' },
    },
    {
      name: 'AAVE on Ethereum',
      search: 'AAVE',
      network: 'ethereum',
      expect: { symbolOrName: 'AAVE' },
    },
    {
      name: 'UNI on Ethereum',
      search: 'UNI',
      network: 'ethereum',
      expect: { symbolOrName: 'UNI' },
    },
    {
      name: 'XDAI on Gnosis (native)',
      search: 'XDAI',
      network: 'gnosis',
      expect: { assetIdPrefix: 'eip155:100/slip44:60' },
    },
  ]

  for (const tc of cases) {
    test(tc.name, () => {
      const results = AssetService.getInstance().searchWithScores(tc.search, tc.network)
      expect(results.length).toBeGreaterThan(0)

      const top = results[0]!
      const topAsset = top.asset

      // The top result must not be a pool token
      expect(topAsset.isPool).not.toBe(true)
      expect(topAsset.symbol).not.toContain('/')

      if (tc.expect.assetId) {
        expect(topAsset.assetId).toBe(tc.expect.assetId)
      }

      if (tc.expect.assetIdPrefix) {
        expect(topAsset.assetId).toStartWith(tc.expect.assetIdPrefix)
      }

      if (tc.expect.symbolOrName) {
        expect(topAsset.symbol.toUpperCase()).toBe(tc.expect.symbolOrName.toUpperCase())
      }
    })
  }
})
