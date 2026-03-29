import { describe, expect, test } from 'bun:test'

import { getAllCommittedAmounts, getCommittedAmountForToken } from '../committedBalances'
import type { ActiveOrderSummary, WalletContext } from '../walletContextSimple'

const SAFE = '0xSafeAddress'
const CHAIN_ID = 1
const TOKEN_A = '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa'
const TOKEN_B = '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB'

function makeOrder(overrides: Partial<ActiveOrderSummary> = {}): ActiveOrderSummary {
  return {
    orderHash: '0x' + Math.random().toString(16).slice(2),
    chainId: CHAIN_ID,
    sellTokenAddress: TOKEN_A,
    sellTokenSymbol: 'TKA',
    sellAmountBaseUnit: '1000',
    sellAmountHuman: '0.001',
    buyTokenAddress: TOKEN_B,
    buyTokenSymbol: 'TKB',
    buyAmountHuman: '1',
    strikePrice: '1000',
    validTo: Math.floor(Date.now() / 1000) + 3600,
    submitTxHash: '0xabc',
    createdAt: Math.floor(Date.now() / 1000) - 3600,
    network: 'ethereum',
    status: 'open',
    orderType: 'stopLoss',
    ...overrides,
  }
}

describe('getCommittedAmountForToken', () => {
  test('returns 0n when walletContext is undefined', () => {
    expect(getCommittedAmountForToken(undefined, SAFE, CHAIN_ID, TOKEN_A)).toBe(0n)
  })

  test('returns 0n when registryOrders is undefined', () => {
    const ctx: WalletContext = {}
    expect(getCommittedAmountForToken(ctx, SAFE, CHAIN_ID, TOKEN_A)).toBe(0n)
  })

  test('returns 0n when registryOrders is empty', () => {
    const ctx: WalletContext = { registryOrders: [] }
    expect(getCommittedAmountForToken(ctx, SAFE, CHAIN_ID, TOKEN_A)).toBe(0n)
  })

  test('returns 0n when no orders match chain or token', () => {
    const ctx: WalletContext = {
      registryOrders: [makeOrder({ chainId: 999 }), makeOrder({ sellTokenAddress: '0xUnrelated' })],
    }
    expect(getCommittedAmountForToken(ctx, SAFE, CHAIN_ID, TOKEN_A)).toBe(0n)
  })

  test('returns 0n when all matching orders have non-open status', () => {
    const ctx: WalletContext = {
      registryOrders: [
        makeOrder({ status: 'fulfilled' }),
        makeOrder({ status: 'cancelled' }),
        makeOrder({ status: 'expired' }),
      ],
    }
    expect(getCommittedAmountForToken(ctx, SAFE, CHAIN_ID, TOKEN_A)).toBe(0n)
  })

  test('returns 0n when all matching orders are expired', () => {
    const pastTime = Math.floor(Date.now() / 1000) - 100
    const ctx: WalletContext = {
      registryOrders: [makeOrder({ validTo: pastTime }), makeOrder({ validTo: pastTime - 1000 })],
    }
    expect(getCommittedAmountForToken(ctx, SAFE, CHAIN_ID, TOKEN_A)).toBe(0n)
  })

  test('sums sellAmountBaseUnit for open eligible orders', () => {
    const ctx: WalletContext = {
      registryOrders: [makeOrder({ sellAmountBaseUnit: '1000' }), makeOrder({ sellAmountBaseUnit: '2500' })],
    }
    expect(getCommittedAmountForToken(ctx, SAFE, CHAIN_ID, TOKEN_A)).toBe(3500n)
  })

  test('matches token address case-insensitively', () => {
    const ctx: WalletContext = {
      registryOrders: [makeOrder({ sellTokenAddress: TOKEN_A.toLowerCase(), sellAmountBaseUnit: '500' })],
    }
    expect(getCommittedAmountForToken(ctx, SAFE, CHAIN_ID, TOKEN_A.toUpperCase())).toBe(500n)
  })

  test('treats validTo of 0 as non-expiring', () => {
    const ctx: WalletContext = {
      registryOrders: [makeOrder({ validTo: 0, sellAmountBaseUnit: '777' })],
    }
    expect(getCommittedAmountForToken(ctx, SAFE, CHAIN_ID, TOKEN_A)).toBe(777n)
  })
})

describe('getAllCommittedAmounts', () => {
  test('returns empty map when walletContext is undefined', () => {
    expect(getAllCommittedAmounts(undefined, SAFE, CHAIN_ID).size).toBe(0)
  })

  test('returns empty map with no orders', () => {
    const ctx: WalletContext = { registryOrders: [] }
    expect(getAllCommittedAmounts(ctx, SAFE, CHAIN_ID).size).toBe(0)
  })

  test('groups committed amounts by token address', () => {
    const ctx: WalletContext = {
      registryOrders: [
        makeOrder({ sellTokenAddress: TOKEN_A, sellAmountBaseUnit: '1000' }),
        makeOrder({ sellTokenAddress: TOKEN_A, sellAmountBaseUnit: '500' }),
        makeOrder({ sellTokenAddress: TOKEN_B, sellAmountBaseUnit: '2000' }),
      ],
    }
    const result = getAllCommittedAmounts(ctx, SAFE, CHAIN_ID)
    expect(result.size).toBe(2)
    expect(result.get(TOKEN_A.toLowerCase())).toBe(1500n)
    expect(result.get(TOKEN_B.toLowerCase())).toBe(2000n)
  })

  test('excludes expired and non-open orders from the map', () => {
    const pastTime = Math.floor(Date.now() / 1000) - 100
    const ctx: WalletContext = {
      registryOrders: [
        makeOrder({ sellTokenAddress: TOKEN_A, sellAmountBaseUnit: '1000' }),
        makeOrder({ sellTokenAddress: TOKEN_A, sellAmountBaseUnit: '2000' }),
        makeOrder({ sellTokenAddress: TOKEN_B, sellAmountBaseUnit: '3000', validTo: pastTime }),
        makeOrder({ sellTokenAddress: TOKEN_B, sellAmountBaseUnit: '4000', status: 'cancelled' }),
      ],
    }
    const result = getAllCommittedAmounts(ctx, SAFE, CHAIN_ID)
    expect(result.get(TOKEN_A.toLowerCase())).toBe(3000n)
    expect(result.has(TOKEN_B.toLowerCase())).toBe(false)
  })

  test('uses lowercase token addresses as map keys', () => {
    const mixedCaseToken = '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12'
    const ctx: WalletContext = {
      registryOrders: [makeOrder({ sellTokenAddress: mixedCaseToken, sellAmountBaseUnit: '100' })],
    }
    const result = getAllCommittedAmounts(ctx, SAFE, CHAIN_ID)
    expect(result.has(mixedCaseToken.toLowerCase())).toBe(true)
    expect(result.has(mixedCaseToken)).toBe(false)
  })
})
