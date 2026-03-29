export const SOLA_RANGO_TX_ENVELOPE_V = 1 as const

export type SolaRangoTxRangoType = 'COSMOS' | 'TRON' | 'TRANSFER' | 'STARKNET' | 'TON'

export type SolaRangoTxEnvelopeV1 = {
  v: typeof SOLA_RANGO_TX_ENVELOPE_V
  rangoType: SolaRangoTxRangoType
  tx: Record<string, unknown>
}
