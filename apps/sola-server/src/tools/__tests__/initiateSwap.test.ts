import { beforeEach, describe, expect, mock, test } from 'bun:test'

import type { RangoQuoteOptionSummary } from '../../utils/getRangoSwap'
import { executeInitiateSwap, executeInitiateSwapUsd, initiateSwapSchema } from '../initiateSwap'

const defaultQuotes: RangoQuoteOptionSummary[] = [
  {
    swapperId: 'test-swapper',
    swapperTitle: 'Test Swapper',
    outputAmount: '3500',
    outputAmountMin: '3400',
    outputAmountUsd: 3500,
    feeUsd: 1.5,
    estimatedTimeSeconds: 120,
    pathStepCount: 2,
    resultType: 'OK',
  },
]

const rangoMockState = { quotes: defaultQuotes as RangoQuoteOptionSummary[] }

void mock.module('../../utils/assetHelpers', () => ({
  resolveAsset: async (input: { symbolOrName: string; network?: string }) => {
    const sym = input.symbolOrName.toUpperCase()
    if (sym === 'ETH') {
      return {
        assetId: 'eip155:1/slip44:60',
        chainId: 'eip155:1',
        symbol: 'ETH',
        precision: 18,
        network: input.network ?? 'ethereum',
        name: 'Ethereum',
        price: '2000',
      }
    }
    if (sym === 'USDC') {
      return {
        assetId: 'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        chainId: 'eip155:1',
        symbol: 'USDC',
        precision: 6,
        network: input.network ?? 'ethereum',
        name: 'USD Coin',
        price: '1',
      }
    }
    if (sym === 'NOPRICE') {
      return {
        assetId: 'eip155:1/erc20:0x0000000000000000000000000000000000000001',
        chainId: 'eip155:1',
        symbol: 'NOPRICE',
        precision: 18,
        network: 'ethereum',
        name: 'No Price Token',
        price: '0',
      }
    }
    throw new Error(`No asset found for "${input.symbolOrName}"`)
  },
}))

void mock.module('../../utils/getRangoSwap', () => ({
  getRangoQuoteAlternatives: async () => rangoMockState.quotes,
  getRangoSwap: async () => {
    throw new Error('getRangoSwap should not be called in these tests')
  },
}))

describe('initiateSwapSchema', () => {
  test('rejects invalid network on asset inputs', () => {
    const result = initiateSwapSchema.safeParse({
      sellAsset: { symbolOrName: 'ETH', network: 'not-a-network' },
      buyAsset: { symbolOrName: 'USDC', network: 'ethereum' },
      sellAmount: '1',
    })
    expect(result.success).toBe(false)
  })
})

describe('executeInitiateSwap', () => {
  beforeEach(() => {
    rangoMockState.quotes = [...defaultQuotes]
  })

  test('throws when sell amount is not positive', async () => {
    await expect(
      executeInitiateSwap({
        sellAsset: { symbolOrName: 'ETH', network: 'ethereum' },
        buyAsset: { symbolOrName: 'USDC', network: 'ethereum' },
        sellAmount: '0',
      })
    ).rejects.toThrow(/positive number/)
  })

  test('throws when Rango returns no quotes', async () => {
    rangoMockState.quotes = []
    await expect(
      executeInitiateSwap({
        sellAsset: { symbolOrName: 'ETH', network: 'ethereum' },
        buyAsset: { symbolOrName: 'USDC', network: 'ethereum' },
        sellAmount: '1',
      })
    ).rejects.toThrow(/No swap routes found/)
  })

  test('returns awaitingRouteSelection with quote options when quotes exist', async () => {
    const out = await executeInitiateSwap({
      sellAsset: { symbolOrName: 'ETH', network: 'ethereum' },
      buyAsset: { symbolOrName: 'USDC', network: 'ethereum' },
      sellAmount: '1',
    })

    expect(out.awaitingRouteSelection).toBe(true)
    expect(out.quoteOptions).toBeDefined()
    expect(out.quoteOptions!).toHaveLength(1)
    expect(out.quoteOptions![0]!.swapperId).toBe('test-swapper')
    expect(out.summary.sellAsset.symbol).toBe('ETH')
    expect(out.summary.buyAsset.estimatedAmount).toBe('3500')
  })
})

describe('executeInitiateSwapUsd', () => {
  beforeEach(() => {
    rangoMockState.quotes = [...defaultQuotes]
  })

  test('throws when sell asset has no usable price', async () => {
    await expect(
      executeInitiateSwapUsd({
        sellAsset: { symbolOrName: 'NOPRICE', network: 'ethereum' },
        buyAsset: { symbolOrName: 'USDC', network: 'ethereum' },
        sellAmountUsd: '100',
      })
    ).rejects.toThrow(/Unable to fetch price/)
  })

  test('converts USD notional to crypto and returns quote flow', async () => {
    const out = await executeInitiateSwapUsd({
      sellAsset: { symbolOrName: 'ETH', network: 'ethereum' },
      buyAsset: { symbolOrName: 'USDC', network: 'ethereum' },
      sellAmountUsd: '2000',
    })

    expect(out.awaitingRouteSelection).toBe(true)
    expect(out.summary.sellAsset.amount).toBe('1')
  })
})
