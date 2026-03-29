import { isBitcoinWallet } from '@dynamic-labs/bitcoin'
import { isCosmosWallet } from '@dynamic-labs/cosmos'
import { isEthereumWallet } from '@dynamic-labs/ethereum'
import type { useUserWallets } from '@dynamic-labs/sdk-react-core'
import { isSolanaWallet } from '@dynamic-labs/solana'
import { isStarknetWallet } from '@dynamic-labs/starknet'
import { isSuiWallet } from '@dynamic-labs/sui'
import { isTronWallet } from '@dynamic-labs/tron'
import {
  btcChainId,
  cosmosChainId,
  suiChainId,
  tronChainId,
} from '@sola-ai/caip'

/** Starknet mainnet (CAIP-2 style; matches common asset / Rango usage). */
export const STARKNET_SN_MAIN_CAIP = 'starknet:SN_MAIN'

export type DynamicUserWallet = ReturnType<typeof useUserWallets>[number]

/**
 * Maps non-EVM / non-Solana Dynamic-linked wallets to CAIP chain ids for `WalletContext.connectedWallets`.
 * EVM and Solana are omitted — the server already receives `evmAddress` / `solanaAddress`.
 */
export function collectDynamicMultichainAddresses(wallets: DynamicUserWallet[]): Record<string, string> {
  const out: Record<string, string> = {}

  for (const w of wallets) {
    const addr = w.address?.trim()
    if (!addr) continue
    // Dynamic `useUserWallets` is typed as Wallet<any>; per-chain type guards expect concrete connector generics.
    const wk = w as never
    if (isEthereumWallet(wk) || isSolanaWallet(wk)) continue

    if (isBitcoinWallet(wk)) {
      out[btcChainId] = addr
    } else if (isCosmosWallet(wk)) {
      out[cosmosChainId] = addr
    } else if (isTronWallet(wk)) {
      out[tronChainId] = addr
    } else if (isStarknetWallet(wk)) {
      out[STARKNET_SN_MAIN_CAIP] = addr
    } else if (isSuiWallet(wk)) {
      out[suiChainId] = addr
    }
  }

  return out
}
