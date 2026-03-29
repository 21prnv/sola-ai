import { connect } from 'get-starknet'

type StarknetCall = { contractAddress: string; entrypoint: string; calldata?: string[] }

export async function sendStarknetRangoTx(tx: Record<string, unknown>): Promise<string> {
  const wallet = await connect({ modalMode: 'neverAsk' })
  if (!wallet) {
    throw new Error('No Starknet wallet found. Install Argent X or Braavos and connect.')
  }

  await wallet.request({ type: 'wallet_requestAccounts' })

  const approveCalls = (tx.approveCalls as StarknetCall[] | undefined) ?? []
  const mainCalls = (tx.calls as StarknetCall[] | undefined) ?? []
  const all = [...approveCalls, ...mainCalls]

  if (!all.length) {
    throw new Error('Rango Starknet transaction has no calls.')
  }

  const calls = all.map(c => ({
    contract_address: c.contractAddress,
    entry_point: c.entrypoint,
    calldata: (c.calldata ?? []) as string[],
  }))

  const result = (await wallet.request({
    type: 'wallet_addInvokeTransaction',
    params: { calls },
  })) as { transaction_hash: string }

  return result.transaction_hash
}
