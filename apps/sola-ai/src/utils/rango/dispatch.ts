import type { TransactionParams } from '@/utils/chains/types'

import { parseSolaRangoEnvelope } from './parseEnvelope'
import { sendCosmosRangoTx } from './sendCosmosRangoTx'
import { sendStarknetRangoTx } from './sendStarknetRangoTx'
import { sendTonRangoTx } from './sendTonRangoTx'
import { sendTronRangoTx } from './sendTronRangoTx'
import { sendTransferRangoTx } from './sendTransferRangoTx'

/**
 * If `data` is a Sola Rango v1 envelope, sign & broadcast with the right browser wallet.
 * @returns tx id / hash, or `null` if `data` is not an envelope (e.g. raw Solana JSON or EVM calldata).
 */
export async function trySendSolaRangoTransaction(params: TransactionParams): Promise<string | null> {
  const env = parseSolaRangoEnvelope(params.data)
  if (!env) return null

  const { rangoType, tx } = env
  const from = params.from

  switch (rangoType) {
    case 'COSMOS':
      return sendCosmosRangoTx(from, tx)
    case 'STARKNET':
      return sendStarknetRangoTx(tx)
    case 'TRON':
      return sendTronRangoTx(from, tx)
    case 'TON':
      return sendTonRangoTx(tx)
    case 'TRANSFER':
      return sendTransferRangoTx(tx)
    default:
      return null
  }
}
