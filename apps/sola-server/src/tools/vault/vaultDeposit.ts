import { fromAssetId } from '@sola-ai/caip'
import type { Asset } from '@sola-ai/types'
import { toBigInt, toBaseUnit } from '@sola-ai/utils'
import { encodeFunctionData, erc20Abi, getAddress } from 'viem'
import { z } from 'zod'

import type { TransactionData } from '../../lib/schemas/swapSchemas'
import { NETWORK_TO_CHAIN_ID, vaultSupportedNetworkSchema } from '../../lib/vaultNetworks'
import { isNativeToken, resolveAsset } from '../../utils/assetHelpers'
import { validateSufficientBalance } from '../../utils/balanceHelpers'
import { createTransaction } from '../../utils/transactionHelpers'
import { getAddressForChain, getSafeAddressForChain } from '../../utils/walletContextSimple'
import type { WalletContext } from '../../utils/walletContextSimple'

export const vaultDepositSchema = z.object({
  asset: z.string().describe('Token symbol or name to deposit (e.g., "WETH", "USDC")'),
  amount: z.string().describe('Amount to deposit in human-readable format (e.g., "1" for 1 WETH)'),
  network: vaultSupportedNetworkSchema.describe('Network for the deposit'),
})

export type VaultDepositInput = z.infer<typeof vaultDepositSchema>

export interface VaultDepositOutput {
  summary: {
    asset: { symbol: string; amount: string }
    network: string
    fromAddress: string
    safeAddress: string
  }
  depositTx: TransactionData
}

function buildDepositTx(
  asset: Asset,
  fromAddress: string,
  safeAddress: string,
  amount: string,
  isNative: boolean
): TransactionData {
  if (isNative) {
    return createTransaction({
      chainId: asset.chainId,
      data: '0x',
      from: getAddress(fromAddress),
      to: getAddress(safeAddress),
      value: toBaseUnit(amount, asset.precision),
    })
  }

  const tokenAddress = fromAssetId(asset.assetId).assetReference
  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'transfer',
    args: [getAddress(safeAddress), toBigInt(toBaseUnit(amount, asset.precision))],
  })

  return createTransaction({
    chainId: asset.chainId,
    data,
    from: getAddress(fromAddress),
    to: getAddress(tokenAddress),
    value: '0',
  })
}

export async function executeVaultDeposit(
  input: VaultDepositInput,
  walletContext?: WalletContext
): Promise<VaultDepositOutput> {
  const safeAddress = await getSafeAddressForChain(walletContext, NETWORK_TO_CHAIN_ID[input.network]!)
  if (!safeAddress) {
    throw new Error('No Safe vault found. Deploy a Safe on this chain first.')
  }

  const asset = await resolveAsset({ symbolOrName: input.asset, network: input.network }, walletContext)
  const fromAddress = getAddressForChain(walletContext, asset.chainId)

  await validateSufficientBalance(fromAddress, asset, input.amount)

  const isNative = isNativeToken(asset)
  const depositTx = buildDepositTx(asset, fromAddress, safeAddress, input.amount, isNative)

  return {
    summary: {
      asset: { symbol: asset.symbol, amount: input.amount },
      network: input.network,
      fromAddress,
      safeAddress,
    },
    depositTx,
  }
}

export const vaultDepositTool = {
  description: `Deposit tokens from your wallet into the Safe automation vault.

UI CARD DISPLAYS: deposit amount, asset, source wallet, and vault address.

IMPORTANT: Do NOT write any response text alongside this tool call. Wait for the tool result before responding. If the tool succeeds, the UI card will show the result — supplement it with one brief sentence, do not duplicate card data. If the tool fails, tell the user what went wrong and suggest alternatives.

Deposits tokens from your EOA wallet into the Safe vault on the selected network.`,
  inputSchema: vaultDepositSchema,
  execute: executeVaultDeposit,
}
