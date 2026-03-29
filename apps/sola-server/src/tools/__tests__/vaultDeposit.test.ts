import { beforeEach, describe, expect, mock, test } from 'bun:test'

import { executeVaultDeposit, vaultDepositSchema } from '../vault/vaultDeposit'

const SAFE = '0x1111111111111111111111111111111111111111' as const
const FROM = '0x2222222222222222222222222222222222222222' as const

const walletState = { safeAddress: SAFE as string | undefined }

void mock.module('../../utils/walletContextSimple', () => ({
  getSafeAddressForChain: async () => walletState.safeAddress,
  getAddressForChain: () => FROM,
}))

void mock.module('../../utils/balanceHelpers', () => ({
  validateSufficientBalance: async () => {},
}))

void mock.module('../../utils/assetHelpers', () => ({
  resolveAsset: async () => ({
    assetId: 'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    chainId: 'eip155:1',
    symbol: 'USDC',
    precision: 6,
    network: 'ethereum',
    name: 'USD Coin',
    price: '1',
  }),
  isNativeToken: () => false,
}))

describe('vaultDepositSchema', () => {
  test('rejects networks outside vault support', () => {
    const result = vaultDepositSchema.safeParse({
      asset: 'USDC',
      amount: '10',
      network: 'solana',
    })
    expect(result.success).toBe(false)
  })

  test('accepts a supported vault network', () => {
    const result = vaultDepositSchema.parse({
      asset: 'USDC',
      amount: '10',
      network: 'ethereum',
    })
    expect(result.network).toBe('ethereum')
  })
})

describe('executeVaultDeposit', () => {
  beforeEach(() => {
    walletState.safeAddress = SAFE
  })

  test('throws when no Safe exists for the chain', async () => {
    walletState.safeAddress = undefined
    await expect(
      executeVaultDeposit({
        asset: 'USDC',
        amount: '10',
        network: 'ethereum',
      })
    ).rejects.toThrow(/No Safe vault/)
  })

  test('returns ERC-20 transfer tx toward the Safe', async () => {
    const out = await executeVaultDeposit({
      asset: 'USDC',
      amount: '10',
      network: 'ethereum',
    })

    expect(out.summary.safeAddress).toBe(SAFE)
    expect(out.summary.fromAddress).toBe(FROM)
    expect(out.depositTx.value).toBe('0')
    expect(out.depositTx.from.toLowerCase()).toBe(FROM.toLowerCase())
    expect(out.depositTx.data).toMatch(/^0x/)
    expect(out.depositTx.data.length).toBeGreaterThan(2)
  })
})
