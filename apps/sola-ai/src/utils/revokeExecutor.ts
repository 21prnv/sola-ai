import type { RevokeApprovalOutput } from '@sola-ai/server'
import { hexToBigInt } from 'viem'

import { sendTransaction } from '@/utils/sendTransaction'
import { getUserFriendlyErrorMessage } from '@/utils/walletErrors'

type TransactionData = RevokeApprovalOutput['tx']

export async function executeRevoke(tx: TransactionData): Promise<string> {
  try {
    const gasLimit = tx.gasLimit
      ? typeof tx.gasLimit === 'string' && tx.gasLimit.startsWith('0x')
        ? Number(hexToBigInt(tx.gasLimit as `0x${string}`))
        : Number(tx.gasLimit)
      : undefined

    return await sendTransaction({
      chainId: tx.chainId,
      data: tx.data,
      from: tx.from,
      to: tx.to,
      value: tx.value,
      ...(gasLimit !== undefined && { gasLimit }),
    })
  } catch (error) {
    throw new Error(getUserFriendlyErrorMessage(error, 'Revoke'))
  }
}
