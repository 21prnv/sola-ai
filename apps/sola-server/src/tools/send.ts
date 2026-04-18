import type { Asset, GetRateOutput } from '@sola-ai/types'

import type { SendInput, SendOutput, SendSummary } from '../lib/schemas/sendSchemas'
import { sendSchema } from '../lib/schemas/sendSchemas'
import type { TransactionData } from '../lib/schemas/swapSchemas'
import { validateAddress } from '../utils/addressValidation'
import { isNativeToken, resolveAsset } from '../utils/assetHelpers'
import { getBalance, validateSufficientBalance } from '../utils/balanceHelpers'
import { isEvmChain, isRangoWalletEnvelopeChain, isSolanaChain } from '../utils/chains/helpers'
import { resolveEnsIfNeeded } from '../utils/ensResolution'
import { calculateMaxSendAmount, formatEstimatedFee } from '../utils/feeEstimation'
import { getRangoSend } from '../utils/getRangoSwap/getRangoSwap'
import { networkToFeeSymbol } from '../utils/networkHelpers'
import { buildEvmNativeTransfer, buildEvmTokenTransfer, buildSolanaTransfer } from '../utils/transactionHelpers'
import { getAddressForChain } from '../utils/walletContextSimple'
import type { WalletContext } from '../utils/walletContextSimple'

const SOLANA_RPC_URL = (() => {
  const url = process.env.VITE_SOLANA_RPC_URL
  if (!url) {
    throw new Error('VITE_SOLANA_RPC_URL environment variable is required')
  }
  return url
})()

export async function executeSend(input: SendInput, walletContext?: WalletContext): Promise<SendOutput> {
  // 1. Resolve asset (prioritize tokens user owns)
  const asset = await resolveAsset(input.asset, walletContext)

  // 2. Get sender address
  const from = getAddressForChain(walletContext, asset.chainId)

  // 3. Resolve contact name, then ENS name if needed, then validate
  let recipient = input.recipient
  const contact = walletContext?.contacts?.find(c => c.name.toLowerCase() === recipient.trim().toLowerCase())
  if (contact) {
    recipient = contact.address
  }
  const { address: resolvedRecipient, ensName } = await resolveEnsIfNeeded(recipient)
  validateAddress(resolvedRecipient, asset.chainId)

  // 4. Get balance and calculate send amount (handle "max")
  const balance = await getBalance(from, asset)

  let sendAmount: string
  if (input.amount.toLowerCase() === 'max') {
    sendAmount = await calculateMaxSendAmount(asset, balance, from, resolvedRecipient)
  } else {
    // Validate amount
    if (!Number.isFinite(parseFloat(input.amount)) || parseFloat(input.amount) <= 0) {
      throw new Error('Amount must be a positive number')
    }
    sendAmount = input.amount

    // Check balance
    await validateSufficientBalance(from, asset, sendAmount)
  }

  // 5. Build transaction
  const txResult = await buildSendTransaction(asset, from, resolvedRecipient, sendAmount)

  // 6. Create summary (show ENS name in display if resolved)
  const displayTo = ensName
    ? `${ensName} (${resolvedRecipient.slice(0, 6)}...${resolvedRecipient.slice(-4)})`
    : undefined
  const summary = createSendSummary(asset, from, resolvedRecipient, sendAmount, txResult, displayTo)

  return {
    summary,
    tx: txResult.tx,
    sendData: {
      assetId: asset.assetId,
      from,
      to: resolvedRecipient,
      amount: sendAmount,
      chainId: asset.chainId,
      asset,
    },
  }
}

async function buildSendTransaction(
  asset: Asset,
  from: string,
  to: string,
  amount: string
): Promise<{ tx: TransactionData; needsAtaCreation?: boolean; rangoNetworkFee?: string }> {
  if (isEvmChain(asset.chainId)) {
    const tx = isNativeToken(asset)
      ? buildEvmNativeTransfer(asset, from, to, amount)
      : buildEvmTokenTransfer(asset, from, to, amount)
    return { tx }
  }
  if (isSolanaChain(asset.chainId)) {
    const result = await buildSolanaTransfer(asset, from, to, amount, SOLANA_RPC_URL)
    return { tx: result, needsAtaCreation: result.needsAtaCreation }
  }
  if (isRangoWalletEnvelopeChain(asset.chainId)) {
    const rate = await getRangoSend(asset, from, to, amount)
    return {
      tx: rangoUnsignedTxToTransactionData(rate.unsignedTx),
      rangoNetworkFee: rate.networkFeeCryptoPrecision,
    }
  }

  throw new Error(`Unsupported chain: ${asset.chainId}`)
}

function rangoUnsignedTxToTransactionData(u: GetRateOutput['unsignedTx']): TransactionData {
  const gas = u.gasLimit
  return {
    chainId: u.chainId,
    from: u.from,
    to: u.to,
    value: u.value,
    data: u.data,
    ...(gas !== undefined && { gasLimit: typeof gas === 'number' ? String(gas) : gas }),
  }
}

function createSendSummary(
  asset: Asset,
  from: string,
  to: string,
  amount: string,
  txResult: { tx: TransactionData; needsAtaCreation?: boolean; rangoNetworkFee?: string },
  displayTo?: string
): SendSummary {
  const assetPrice = parseFloat(asset.price || '0')
  const valueUSD = assetPrice > 0 ? (parseFloat(amount) * assetPrice).toFixed(2) : null

  const feeSymbol = networkToFeeSymbol[asset.network] || asset.symbol.toUpperCase()
  const estimatedFeeCrypto =
    txResult.rangoNetworkFee != null && txResult.rangoNetworkFee !== ''
      ? `~${txResult.rangoNetworkFee}`
      : formatEstimatedFee(asset.chainId, isNativeToken(asset), txResult.needsAtaCreation)

  return {
    asset: `${amount} ${asset.symbol.toUpperCase()}`,
    symbol: asset.symbol.toUpperCase(),
    amount,
    from: `${from.slice(0, 6)}...${from.slice(-4)}`,
    to: displayTo ?? `${to.slice(0, 6)}...${to.slice(-4)}`,
    network: asset.network,
    chainName: asset.network,
    estimatedFeeCrypto,
    estimatedFeeSymbol: feeSymbol,
    estimatedFeeUsd: valueUSD,
    ...(txResult.needsAtaCreation && { ataCreation: true }),
  }
}

export const sendTool = {
  description: `Send crypto to an address or ENS name (e.g. "vitalik.eth").

UI CARD DISPLAYS: send amount, from/to addresses, network, and estimated fees.`,
  inputSchema: sendSchema,
  execute: executeSend,
}

export type { SendInput, SendOutput }
