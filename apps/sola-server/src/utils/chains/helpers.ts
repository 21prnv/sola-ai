import { CHAIN_NAMESPACE, fromChainId } from '@sola-ai/caip'

export const isEvmChain = (chainId: string): boolean => {
  const { chainNamespace } = fromChainId(chainId)
  return chainNamespace === CHAIN_NAMESPACE.Evm
}

export const isSolanaChain = (chainId: string): boolean => {
  const { chainNamespace } = fromChainId(chainId)
  return chainNamespace === CHAIN_NAMESPACE.Solana
}

/**
 * Check if chain supports transaction operations (send, swap, etc.)
 * Currently only EVM and Solana chains are supported
 */
export const supportsTxOperations = (chainId: string): boolean => {
  return isEvmChain(chainId) || isSolanaChain(chainId)
}

/**
 * Chains where send/swap uses Rango + a Sola wallet envelope (Keplr, TronLink, Starknet, TON, UTXO PSBT), not Dynamic EVM/Solana tx builders.
 */
export const isRangoWalletEnvelopeChain = (chainId: string): boolean => {
  const { chainNamespace } = fromChainId(chainId)
  const ns = chainNamespace as string
  return (
    chainNamespace === CHAIN_NAMESPACE.CosmosSdk ||
    chainNamespace === CHAIN_NAMESPACE.Tron ||
    chainNamespace === CHAIN_NAMESPACE.Utxo ||
    ns === 'starknet' ||
    ns === 'ton'
  )
}

/** Receive / deposit address is available when Dynamic (or tool) has a wallet for the chain. */
export const supportsReceiveOnChain = (chainId: string): boolean => {
  return supportsTxOperations(chainId) || isRangoWalletEnvelopeChain(chainId)
}
