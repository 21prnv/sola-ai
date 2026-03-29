import type { StdFee } from '@cosmjs/stargate'
import { SigningStargateClient } from '@cosmjs/stargate'

type CosmosFee = { gas: string; amount: Array<{ amount: string; denom: string }> }
type CosmosProtoMsg = { type_url: string; value: number[] }
type CosmosMessageShape = {
  rpcUrl: string
  chainId: string | null
  protoMsgs: CosmosProtoMsg[]
  fee: CosmosFee | null
  memo: string | null
}

export async function sendCosmosRangoTx(from: string, tx: Record<string, unknown>): Promise<string> {
  const keplr = (window as Window & { keplr?: { enable: (c: string) => Promise<void>; getOfflineSigner: (c: string) => any } })
    .keplr
  if (!keplr) {
    throw new Error('Install Keplr (or a Keplr-compatible wallet) to sign Cosmos routes from Rango.')
  }

  const data = tx.data as CosmosMessageShape | undefined
  if (!data?.rpcUrl || !data.chainId) {
    throw new Error('Invalid Rango Cosmos transaction: missing rpcUrl or chainId.')
  }

  await keplr.enable(data.chainId)
  const signer = keplr.getOfflineSigner(data.chainId)
  const client = await SigningStargateClient.connectWithSigner(data.rpcUrl, signer)

  const protoMsgs = data.protoMsgs
  if (!protoMsgs?.length) {
    throw new Error(
      'Rango Cosmos tx has no protoMsgs. Try the same swap in the Rango app, or use a route that returns protobuf messages.'
    )
  }

  const messages = protoMsgs.map(pm => ({
    typeUrl: pm.type_url,
    value: Uint8Array.from(pm.value),
  }))

  if (!data.fee) {
    throw new Error('Rango Cosmos tx missing fee.')
  }

  const fee: StdFee = {
    amount: data.fee.amount.map(c => ({ denom: c.denom, amount: c.amount })),
    gas: data.fee.gas,
  }

  const result = await client.signAndBroadcast(from, messages, fee, data.memo ?? '')
  return result.transactionHash
}
