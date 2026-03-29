import { fromChainId, CHAIN_NAMESPACE } from '@sola-ai/caip'
import { PublicKey } from '@solana/web3.js'
import { getAddress, isAddress } from 'viem'

import { isEvmChain, isRangoWalletEnvelopeChain, isSolanaChain } from './chains/helpers'

const CHAIN_REFERENCE_BTC_MAINNET = '000000000019d6689c085ae165831e93'

export function validateAddress(address: string, chainId: string): void {
  if (isEvmChain(chainId)) {
    validateEvmAddress(address)
  } else if (isSolanaChain(chainId)) {
    validateSolanaAddress(address)
  } else if (isRangoWalletEnvelopeChain(chainId)) {
    validateRangoMultichainAddress(address, chainId)
  } else {
    throw new Error(`Unsupported chain: ${chainId}`)
  }
}

const COSMOS_ADDR = /^[a-z]{2,12}1[a-z0-9]{38,58}$/

function validateRangoMultichainAddress(address: string, chainId: string): void {
  const t = address.trim()
  if (!t) throw new Error('Address is empty')

  const { chainNamespace } = fromChainId(chainId)
  const ns = chainNamespace as string

  if (chainNamespace === CHAIN_NAMESPACE.CosmosSdk) {
    if (!COSMOS_ADDR.test(t)) throw new Error(`Invalid Cosmos address: ${address}`)
    return
  }

  if (chainNamespace === CHAIN_NAMESPACE.Tron) {
    if (!/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(t)) throw new Error(`Invalid Tron address: ${address}`)
    return
  }

  if (chainNamespace === CHAIN_NAMESPACE.Utxo) {
    validateUtxoAddress(t, chainId)
    return
  }

  if (ns === 'starknet') {
    if (!/^0x[0-9a-fA-F]{50,64}$/.test(t)) throw new Error(`Invalid Starknet address: ${address}`)
    return
  }

  if (ns === 'ton') {
    if (t.length < 40 || t.length > 100) throw new Error(`Invalid TON address: ${address}`)
    return
  }

  throw new Error(`Unsupported chain: ${chainId}`)
}

/** Bitcoin-style (bip122) — loose validation per known references. */
function validateUtxoAddress(address: string, chainId: string): void {
  const { chainReference } = fromChainId(chainId)
  const btcMain = CHAIN_REFERENCE_BTC_MAINNET
  if (chainReference === btcMain) {
    if (!/^(bc1[a-z0-9]{25,87}|[13][a-km-zA-HJ-NP-Z1-9]{25,62})$/.test(address)) {
      throw new Error(`Invalid Bitcoin address: ${address}`)
    }
    return
  }
  if (address.length < 26 || address.length > 95) {
    throw new Error(`Invalid address for ${chainId}`)
  }
}

export function validateEvmAddress(address: string): void {
  if (!isAddress(address)) {
    throw new Error(`Invalid EVM address: ${address}`)
  }
  getAddress(address)
}

export function validateSolanaAddress(address: string): void {
  try {
    new PublicKey(address)
  } catch {
    throw new Error(`Invalid Solana address: ${address}`)
  }
}

export type Hex = `0x${string}`

// Typed wrapper for viem's getAddress — validates and checksums, returning `0x${string}`
export function toChecksumAddress(address: string): Hex {
  return getAddress(address) as Hex
}
