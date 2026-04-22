import { encodeFunctionData, erc20Abi, getAddress, maxUint256 } from 'viem'
import { z } from 'zod'

import type { TransactionData } from '../../lib/schemas/swapSchemas'
import { createTransaction } from '../../utils/transactionHelpers'
import { getAddressForChain } from '../../utils/walletContextSimple'
import type { WalletContext } from '../../utils/walletContextSimple'

import { POLYGON_CAIP_CHAIN_ID, POLYMARKET_CONTRACTS, USDC_DECIMALS } from './constants'

export const approvePolymarketUsdcSchema = z.object({
  amount: z
    .string()
    .describe(
      'Human-readable USDC amount to approve (e.g. "500"). Defaults to a bounded amount; set `unlimited: true` only when the user explicitly asks for infinite approval.'
    ),
  unlimited: z
    .boolean()
    .optional()
    .describe(
      'Set true ONLY if the user explicitly requested an unlimited / infinite approval. If omitted, the tool approves exactly `amount` USDC.'
    ),
  negRisk: z
    .boolean()
    .optional()
    .describe('Approve the Neg-Risk CTF Exchange instead of the standard one (default: false)'),
})

export type ApprovePolymarketUsdcInput = z.infer<typeof approvePolymarketUsdcSchema>

export type ApprovePolymarketUsdcOutput = {
  summary: {
    spender: string
    amount: string
    unlimited: boolean
    network: string
    fromAddress: string
  }
  approveTx: TransactionData
}

export async function executeApprovePolymarketUsdc(
  input: ApprovePolymarketUsdcInput,
  walletContext?: WalletContext
): Promise<ApprovePolymarketUsdcOutput> {
  const fromAddress = getAddressForChain(walletContext, POLYGON_CAIP_CHAIN_ID)
  const spender = input.negRisk ? POLYMARKET_CONTRACTS.negRiskCtfExchange : POLYMARKET_CONTRACTS.ctfExchange

  const parsedAmount = Number(input.amount)
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    throw new Error('approvePolymarketUsdc: amount must be a positive number (e.g. "500")')
  }
  const unlimited = input.unlimited === true
  const amountBaseUnits = unlimited ? maxUint256 : BigInt(Math.floor(parsedAmount * 10 ** USDC_DECIMALS))

  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'approve',
    args: [getAddress(spender), amountBaseUnits],
  })

  const approveTx = createTransaction({
    chainId: POLYGON_CAIP_CHAIN_ID,
    data,
    from: getAddress(fromAddress),
    to: getAddress(POLYMARKET_CONTRACTS.usdc),
    value: '0',
  })

  return {
    summary: {
      spender,
      amount: unlimited ? 'unlimited' : input.amount,
      unlimited,
      network: 'Polygon',
      fromAddress,
    },
    approveTx,
  }
}

export const approvePolymarketUsdcTool = {
  description: `Approve the Polymarket CTF Exchange to spend your USDC on Polygon. Required once before placing any Polymarket order.

Returns an unsigned approval transaction to be signed and submitted by the connected Polygon wallet.

\`amount\` is REQUIRED. Approve only as much as the user intends to trade (default to a small bounded amount, e.g. their order size plus a small buffer). Never pass \`unlimited: true\` unless the user explicitly asks for an unlimited/infinite approval.

UI CARD DISPLAYS: spender contract, approval amount, source wallet.`,
  inputSchema: approvePolymarketUsdcSchema,
  execute: executeApprovePolymarketUsdc,
}
