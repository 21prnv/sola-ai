import { z } from 'zod'

import type { WalletContext } from '../utils/walletContextSimple'

export const checkWalletCapabilitiesSchema = z.object({})

export type CheckWalletCapabilitiesInput = z.infer<typeof checkWalletCapabilitiesSchema>

export type CheckWalletCapabilitiesOutput = {
  walletType: 'connected' | 'none'
  safeAddress?: string
  isSafeReady: boolean
  capabilities: string[]
  automationReady: boolean
}

export function executeCheckWalletCapabilities(
  _input: CheckWalletCapabilitiesInput,
  walletContext?: WalletContext
): CheckWalletCapabilitiesOutput {
  const hasWallet = !!walletContext?.connectedWallets && Object.keys(walletContext.connectedWallets).length > 0
  const isSafeReady = walletContext?.safeDeploymentState
    ? Object.values(walletContext.safeDeploymentState).some(s => s.isDeployed && !!s.safeAddress)
    : false

  const baseCapabilities = [
    'Swap tokens (Rango)',
    'Send & receive',
    'View portfolio',
    'Safe vault (deposit / withdraw)',
  ]

  return {
    walletType: hasWallet ? 'connected' : 'none',
    safeAddress: walletContext?.safeAddress,
    isSafeReady,
    capabilities: isSafeReady
      ? baseCapabilities
      : hasWallet
        ? [...baseCapabilities, 'Deploy Safe on-chain to use vault on a network']
        : baseCapabilities,
    automationReady: isSafeReady,
  }
}

export const checkWalletCapabilitiesTool = {
  description: `Check the connected wallet's capabilities.

Call when the user asks what they can do in Sola AI, or about Safe / vault support.

UI CARD DISPLAYS: wallet status, Safe deployment status on vault chains, and a short capability list.

There are no limit, stop-loss, or TWAP tools — swaps use Rango only.`,
  inputSchema: checkWalletCapabilitiesSchema,
  execute: executeCheckWalletCapabilities,
}
