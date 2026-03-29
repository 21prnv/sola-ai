type TonWindow = Window & {
  ton?: {
    sendTransaction: (p: { valid_until: number; messages: unknown[] }) => Promise<{ boc?: string } | string>
  }
}

export async function sendTonRangoTx(tx: Record<string, unknown>): Promise<string> {
  const ton = (window as TonWindow).ton
  if (!ton?.sendTransaction) {
    throw new Error('Install a TON wallet (e.g. Tonkeeper) with the TON Connect browser API enabled.')
  }

  const validUntil = tx.validUntil as number
  const messages = tx.messages as unknown[]
  if (!Number.isFinite(validUntil) || !messages?.length) {
    throw new Error('Invalid Rango TON transaction payload.')
  }

  const result = await ton.sendTransaction({ valid_until: validUntil, messages })
  if (typeof result === 'string') return result
  if (result && typeof result === 'object' && 'boc' in result && typeof result.boc === 'string') {
    return result.boc
  }
  return JSON.stringify(result)
}
