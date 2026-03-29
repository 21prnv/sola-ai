import type { Asset } from '@sola-ai/types'
import { chainIdToNetwork } from '@sola-ai/types'
import { fromBaseUnit, toBigInt, toBaseUnit } from '@sola-ai/utils'

import { executeGetAccount } from '../tools/getAccount'

import { isEvmChain, isRangoWalletEnvelopeChain, isSolanaChain } from './chains/helpers'
import { getRangoBalanceBaseUnitForAsset } from './getRangoSwap/getRangoBalance'

export async function getBalance(address: string, asset: Asset): Promise<string> {
  if (isRangoWalletEnvelopeChain(asset.chainId)) {
    const b = await getRangoBalanceBaseUnitForAsset(address, asset)
    return b ?? '0'
  }

  if (!isEvmChain(asset.chainId) && !isSolanaChain(asset.chainId)) {
    throw new Error(`Unsupported chain for balance fetch: ${asset.chainId}`)
  }

  const network = chainIdToNetwork[asset.chainId as keyof typeof chainIdToNetwork]
  if (!network) {
    throw new Error(`No indexer network mapping for chain ${asset.chainId}`)
  }

  const accountData = await executeGetAccount({
    address,
    network,
  })

  return accountData.balances[asset.assetId] || '0'
}

export async function validateSufficientBalance(address: string, asset: Asset, requiredAmount: string): Promise<void> {
  let balance: string

  if (isRangoWalletEnvelopeChain(asset.chainId)) {
    const b = await getRangoBalanceBaseUnitForAsset(address, asset)
    if (b === null) {
      return
    }
    balance = b
  } else {
    balance = await getBalance(address, asset)
  }

  const requiredAmountBaseUnit = toBaseUnit(requiredAmount, asset.precision)

  if (toBigInt(balance) < toBigInt(requiredAmountBaseUnit)) {
    const available = fromBaseUnit(balance, asset.precision)
    throw new Error(`Insufficient ${asset.symbol} balance. Required: ${requiredAmount}, Available: ${available}`)
  }
}
