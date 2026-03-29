import type { Asset } from '@sola-ai/types'

import { assetToRangoAsset, getRangoClient } from './getRangoSwap'
import { getCachedRangoBlockchains } from './rangoBlockchainResolver'

type RangoWant = { blockchain: string; address: string | null; symbol?: string }

function normalizeAddr(a: string | null | undefined): string | null {
  if (a == null || a === '') return null
  return a.toLowerCase()
}

function matchesRangoBalanceRow(
  have: { blockchain: string; address: string | null; symbol: string },
  want: RangoWant
): boolean {
  if (have.blockchain !== want.blockchain) return false
  const ha = normalizeAddr(have.address)
  const wa = normalizeAddr(want.address)
  if (ha !== wa) return false
  if (wa === null && want.symbol !== undefined && have.symbol.toUpperCase() !== want.symbol.toUpperCase()) {
    return false
  }
  return true
}

/**
 * Wallet balance in base units for `asset`, via Rango `/basic/balance`.
 * Returns null if Rango could not return a matching row (caller should skip strict preflight checks).
 */
export async function getRangoBalanceBaseUnitForAsset(walletAddress: string, asset: Asset): Promise<string | null> {
  const rango = getRangoClient()
  const blockchains = await getCachedRangoBlockchains(rango)
  const want = assetToRangoAsset(asset, blockchains)

  let res
  try {
    res = await rango.balance({ blockchain: want.blockchain, address: walletAddress })
  } catch {
    return null
  }

  for (const w of res.wallets) {
    if (w.failed || !w.balances?.length) continue
    for (const row of w.balances) {
      if (matchesRangoBalanceRow(row.asset, want)) {
        return row.amount.amount
      }
    }
  }
  return null
}
