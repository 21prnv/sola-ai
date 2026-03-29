type TronWindow = Window & {
  tronWeb?: {
    ready?: boolean
    defaultAddress?: { base58?: string }
    trx: {
      sign: (tx: unknown) => Promise<unknown>
      sendRawTransaction: (signed: unknown) => Promise<{ result?: boolean; message?: string; txid?: string }>
    }
  }
}

export async function sendTronRangoTx(from: string, tx: Record<string, unknown>): Promise<string> {
  const tronWeb = (window as TronWindow).tronWeb
  if (!tronWeb?.ready) {
    throw new Error('Install TronLink (or another Tron wallet) to sign Tron routes from Rango.')
  }

  const payload = {
    visible: tx.visible as boolean | undefined,
    txID: tx.txID as string,
    raw_data: tx.raw_data,
    raw_data_hex: tx.raw_data_hex as string | null,
  }

  const signed = await tronWeb.trx.sign(payload)
  const sent = await tronWeb.trx.sendRawTransaction(signed)
  if (!sent.result) {
    throw new Error(sent.message || 'Tron broadcast failed')
  }
  const id = sent.txid || (tx.txID as string)
  if (!id) throw new Error('Tron broadcast returned no transaction id')
  void from
  return id
}
