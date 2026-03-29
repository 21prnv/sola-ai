import {
  arbitrumChainId,
  avalancheChainId,
  baseChainId,
  bscChainId,
  ethChainId,
  gnosisChainId,
  optimismChainId,
  polygonChainId,
  solanaChainId,
} from '@sola-ai/caip'

import type {
  ActiveOrderSummary,
  KnownTransaction,
  SafeChainDeployment,
  WalletContext,
} from './walletContextSimple'

export const allEvmChainIds = [
  ethChainId,
  arbitrumChainId,
  optimismChainId,
  baseChainId,
  polygonChainId,
  avalancheChainId,
  bscChainId,
  gnosisChainId,
]

export const allSupportedChainIds = [...allEvmChainIds, solanaChainId]

export function buildWalletContextFromChatFields(
  evmAddress?: string,
  solanaAddress?: string,
  approvedChainIds?: string[],
  safeAddress?: string,
  safeDeploymentState?: Record<number, SafeChainDeployment>,
  registryOrders?: ActiveOrderSummary[],
  knownTransactions?: KnownTransaction[],
  dynamicMultichainAddresses?: Record<string, string>
): WalletContext {
  const connectedWallets: Record<string, { address: string }> = {}

  if (evmAddress) {
    const chainsToRegister =
      approvedChainIds && approvedChainIds.length > 0
        ? allEvmChainIds.filter(chainId => approvedChainIds.includes(chainId))
        : allEvmChainIds

    chainsToRegister.forEach(chainId => {
      connectedWallets[chainId] = { address: evmAddress }
    })
  }

  if (solanaAddress) {
    const solanaApproved =
      !approvedChainIds || approvedChainIds.length === 0 || approvedChainIds.includes(solanaChainId)
    if (solanaApproved) {
      connectedWallets[solanaChainId] = { address: solanaAddress }
    }
  }

  if (dynamicMultichainAddresses) {
    for (const [chainId, address] of Object.entries(dynamicMultichainAddresses)) {
      const trimmed = address?.trim()
      if (trimmed) {
        connectedWallets[chainId] = { address: trimmed }
      }
    }
  }

  return {
    connectedWallets,
    safeAddress,
    safeDeploymentState,
    registryOrders,
    knownTransactions,
  }
}
