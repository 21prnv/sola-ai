type UnisatWindow = Window & {
  unisat?: {
    signPsbt: (psbt: string) => Promise<string>
    pushPsbt?: (psbt: string) => Promise<string>
  }
}

type PsbtBlock = { unsignedPsbtBase64: string }

export async function sendTransferRangoTx(tx: Record<string, unknown>): Promise<string> {
  const psbt = tx.psbt as PsbtBlock | null | undefined
  const unisat = (window as UnisatWindow).unisat

  if (!psbt?.unsignedPsbtBase64) {
    throw new Error('Rango UTXO transaction is missing PSBT data. Use a compatible Bitcoin wallet flow.')
  }

  if (!unisat?.signPsbt) {
    throw new Error('Install Unisat (or another wallet that exposes window.unisat.signPsbt) for UTXO swaps from Rango.')
  }

  const signed = await unisat.signPsbt(psbt.unsignedPsbtBase64)
  if (unisat.pushPsbt) {
    return unisat.pushPsbt(signed)
  }

  throw new Error(
    'PSBT signed but broadcast is not available (window.unisat.pushPsbt missing). Copy the signed PSBT or complete the swap in the Rango interface.'
  )
}
