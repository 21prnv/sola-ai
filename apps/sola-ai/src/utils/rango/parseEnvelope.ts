import { SOLA_RANGO_TX_ENVELOPE_V } from './types'
import type { SolaRangoTxEnvelopeV1, SolaRangoTxRangoType } from './types'

const RANGO_TYPES = new Set<SolaRangoTxRangoType>(['COSMOS', 'TRON', 'TRANSFER', 'STARKNET', 'TON'])

export function parseSolaRangoEnvelope(data: string): SolaRangoTxEnvelopeV1 | null {
  const t = data.trim()
  if (!t.startsWith('{')) return null
  try {
    const o = JSON.parse(t) as { v?: number; rangoType?: string; tx?: unknown }
    if (
      o.v === SOLA_RANGO_TX_ENVELOPE_V &&
      typeof o.rangoType === 'string' &&
      RANGO_TYPES.has(o.rangoType as SolaRangoTxRangoType) &&
      o.tx !== null &&
      typeof o.tx === 'object'
    ) {
      return {
        v: SOLA_RANGO_TX_ENVELOPE_V,
        rangoType: o.rangoType as SolaRangoTxRangoType,
        tx: o.tx as Record<string, unknown>,
      }
    }
  } catch {
    return null
  }
  return null
}
