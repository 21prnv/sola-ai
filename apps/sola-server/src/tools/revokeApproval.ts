import { fromAssetId } from '@sola-ai/caip'
import { getViemClient } from '@sola-ai/utils'
import { erc20Abi, encodeFunctionData, getAddress, formatUnits } from 'viem'
import { z } from 'zod'

import { assetInputSchema } from '../lib/schemas/swapSchemas'
import type { TransactionData } from '../lib/schemas/swapSchemas'
import { resolveAsset } from '../utils/assetHelpers'
import { isEvmChain } from '../utils/chains/helpers'
import { createTransaction } from '../utils/transactionHelpers'
import { getAddressForChain } from '../utils/walletContextSimple'
import type { WalletContext } from '../utils/walletContextSimple'

export const revokeApprovalSchema = z.object({
  asset: assetInputSchema.describe('The ERC20 token to revoke approval for (e.g., USDC, DAI)'),
  spender: z.string().describe('The spender contract address to revoke approval from'),
})

export type RevokeApprovalInput = z.infer<typeof revokeApprovalSchema>

export type RevokeApprovalOutput = {
  summary: {
    asset: string
    symbol: string
    spender: string
    network: string
    currentAllowance: string
  }
  tx: TransactionData
  revokeData: {
    assetId: string
    from: string
    spender: string
    chainId: string
    network: string
  }
}

export async function executeRevokeApproval(
  input: RevokeApprovalInput,
  walletContext?: WalletContext
): Promise<RevokeApprovalOutput> {
  const asset = await resolveAsset(input.asset, walletContext)

  if (!isEvmChain(asset.chainId)) {
    throw new Error('Token approval revocation is only supported on EVM chains.')
  }

  const from = getAddressForChain(walletContext, asset.chainId)
  const spender = getAddress(input.spender)
  const tokenAddress = getAddress(fromAssetId(asset.assetId).assetReference)

  // Check current allowance
  const client = getViemClient(asset.chainId)
  const currentAllowance = await client.readContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [getAddress(from), spender],
  })

  if (currentAllowance === 0n) {
    throw new Error(
      `No active approval found for ${asset.symbol.toUpperCase()} to spender ${input.spender.slice(0, 6)}...${input.spender.slice(-4)}. Nothing to revoke.`
    )
  }

  // Build revoke tx (approve to 0)
  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'approve',
    args: [spender, 0n],
  })

  const tx = createTransaction({
    chainId: asset.chainId,
    data,
    from,
    to: fromAssetId(asset.assetId).assetReference,
    value: '0',
  })

  const formattedAllowance = formatUnits(currentAllowance, asset.precision)

  return {
    summary: {
      asset: `${asset.symbol.toUpperCase()}`,
      symbol: asset.symbol.toUpperCase(),
      spender: `${input.spender.slice(0, 6)}...${input.spender.slice(-4)}`,
      network: asset.network,
      currentAllowance: formattedAllowance,
    },
    tx,
    revokeData: {
      assetId: asset.assetId,
      from,
      spender: input.spender,
      chainId: asset.chainId,
      network: asset.network,
    },
  }
}

export const revokeApprovalTool = {
  description: `Revoke (set to zero) a token approval for a specific spender address. Only works for ERC20 tokens on EVM chains.

UI CARD DISPLAYS: token, spender, current allowance, and network. Requires user signature to execute.`,
  inputSchema: revokeApprovalSchema,
  execute: executeRevokeApproval,
}
