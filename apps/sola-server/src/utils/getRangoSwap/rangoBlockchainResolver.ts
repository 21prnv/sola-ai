import { CHAIN_NAMESPACE, CHAIN_REFERENCE, fromChainId } from '@sola-ai/caip'
import type { ChainId } from '@sola-ai/caip'
import type { RangoClient } from 'rango-sdk-basic'
import type { BlockchainMeta } from 'rango-types/basicApi'
import { TransactionType } from 'rango-types/basicApi'

/** CAIP bip122 reference (genesis hash) → Rango `name` for TRANSFER-type chains ([integrations](https://docs.rango.exchange/integrations)). */
const BIP122_REFERENCE_TO_RANGO: Record<string, string> = {
  [CHAIN_REFERENCE.BitcoinMainnet]: 'BTC',
  [CHAIN_REFERENCE.BitcoinCashMainnet]: 'BCH',
  [CHAIN_REFERENCE.DogecoinMainnet]: 'DOGE',
  [CHAIN_REFERENCE.LitecoinMainnet]: 'LTC',
}

let blockchainsCache: { list: BlockchainMeta[]; expiresAt: number } | null = null

function metaCacheTtlMs(): number {
  const raw = process.env.RANGO_META_CACHE_MS?.trim()
  if (!raw) return 60 * 60 * 1000
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n >= 0 ? n : 60 * 60 * 1000
}

/** Blockchains from Rango `meta()` — source of truth for [supported chains](https://docs.rango.exchange/integrations). */
export async function getCachedRangoBlockchains(rango: RangoClient): Promise<BlockchainMeta[]> {
  const now = Date.now()
  if (blockchainsCache && blockchainsCache.expiresAt > now) {
    return blockchainsCache.list
  }
  const meta = await rango.meta()
  const ttl = metaCacheTtlMs()
  blockchainsCache = { list: meta.blockchains, expiresAt: now + ttl }
  return meta.blockchains
}

function evmChainIdEquals(caipNumericRef: string, rangoHexChainId: string): boolean {
  try {
    return BigInt(caipNumericRef) === BigInt(rangoHexChainId)
  } catch {
    return false
  }
}

function normHex(s: string): string {
  return s.toLowerCase().replace(/^0x/, '')
}

/**
 * Map a Sola CAIP chain id to Rango’s `blockchain` string (must match Rango meta / integrations).
 */
export function resolveRangoBlockchainName(blockchains: BlockchainMeta[], caipChainId: ChainId): string {
  const { chainNamespace, chainReference } = fromChainId(caipChainId)

  if (chainNamespace === CHAIN_NAMESPACE.Evm) {
    const match = blockchains.find(
      b => b.type === TransactionType.EVM && b.enabled && evmChainIdEquals(chainReference, b.chainId as string)
    )
    if (match) return match.name
    throw new Error(
      `Rango: no enabled EVM chain in meta for eip155:${chainReference}. See https://docs.rango.exchange/integrations`
    )
  }

  if (chainNamespace === CHAIN_NAMESPACE.Solana) {
    const sol = blockchains.filter(b => b.type === TransactionType.SOLANA && b.enabled) as Array<
      BlockchainMeta & { chainId: string }
    >
    const byRef = sol.find(s => s.chainId.toLowerCase() === chainReference.toLowerCase())
    if (byRef) return byRef.name
    if (sol.length === 1) return sol[0].name
    throw new Error(
      `Rango: could not map Solana chain ${caipChainId} (multiple Solana networks in meta; chain id must match).`
    )
  }

  if (chainNamespace === CHAIN_NAMESPACE.CosmosSdk) {
    const match = blockchains.find(
      b =>
        b.type === TransactionType.COSMOS && b.enabled && b.chainId != null && (b.chainId as string) === chainReference
    )
    if (match) return match.name
    throw new Error(`Rango: no enabled Cosmos chain in meta for "${chainReference}"`)
  }

  if (chainNamespace === CHAIN_NAMESPACE.Tron) {
    const tron = blockchains.filter(b => b.type === TransactionType.TRON && b.enabled) as Array<
      BlockchainMeta & { chainId: string }
    >
    const ref = normHex(chainReference)
    const match = tron.find(t => {
      try {
        return normHex(t.chainId) === ref || BigInt(t.chainId) === BigInt(chainReference)
      } catch {
        return normHex(t.chainId) === ref
      }
    })
    if (match) return match.name
    if (tron.length === 1) return tron[0].name
    throw new Error(`Rango: could not map Tron chain ${caipChainId}`)
  }

  if (chainNamespace === CHAIN_NAMESPACE.Sui) {
    const sui = blockchains.filter(b => b.type === TransactionType.SUI && b.enabled) as Array<
      BlockchainMeta & { chainId: string }
    >
    const match = sui.find(
      s =>
        s.chainId === chainReference ||
        s.chainId === `sui-${chainReference}` ||
        (chainReference === 'mainnet' && (s.name === 'SUI' || s.chainId.includes('mainnet')))
    )
    if (match) return match.name
    if (sui.length === 1) return sui[0].name
    throw new Error(`Rango: could not map Sui chain ${caipChainId}`)
  }

  if (chainNamespace === CHAIN_NAMESPACE.Utxo) {
    const code = BIP122_REFERENCE_TO_RANGO[chainReference]
    if (!code) {
      throw new Error(
        `Rango: UTXO chain ${caipChainId} — add genesis hash mapping in BIP122_REFERENCE_TO_RANGO (Rango TRANSFER names: BTC, BCH, …).`
      )
    }
    const transfer = blockchains.find(b => b.type === TransactionType.TRANSFER && b.enabled && b.name === code)
    if (transfer) return transfer.name
    throw new Error(`Rango: TRANSFER blockchain "${code}" not found or disabled in meta for ${caipChainId}`)
  }

  if (chainNamespace === CHAIN_NAMESPACE.Cardano) {
    throw new Error(`Rango: Cardano (${caipChainId}) is not supported for Basic API swaps in this integration.`)
  }

  // Non-CAIP-standard namespaces used in the wild (starknet, ton, xrpl, stellar)
  if (chainNamespace === 'starknet') {
    const list = blockchains.filter(b => b.type === TransactionType.STARKNET && b.enabled) as Array<
      BlockchainMeta & { chainId: string }
    >
    const match = list.find(s => s.chainId === chainReference || evmChainIdEquals(chainReference, s.chainId))
    if (match) return match.name
    if (list.length === 1) return list[0].name
    throw new Error(`Rango: could not map Starknet chain ${caipChainId}`)
  }

  if (chainNamespace === 'ton') {
    const list = blockchains.filter(b => b.type === TransactionType.TON && b.enabled) as Array<
      BlockchainMeta & { chainId: string }
    >
    const match = list.find(t => t.chainId === chainReference)
    if (match) return match.name
    if (list.length === 1) return list[0].name
    throw new Error(`Rango: could not map TON chain ${caipChainId}`)
  }

  if (chainNamespace === 'xrpl' || chainNamespace === 'xrp') {
    const list = blockchains.filter(b => b.type === TransactionType.XRPL && b.enabled) as Array<
      BlockchainMeta & { chainId: string }
    >
    const match = list.find(x => x.chainId === chainReference)
    if (match) return match.name
    if (list.length === 1) return list[0].name
    throw new Error(`Rango: could not map XRPL chain ${caipChainId}`)
  }

  if (chainNamespace === 'stellar') {
    const list = blockchains.filter(b => b.type === TransactionType.STELLAR && b.enabled)
    if (list.length === 1) return list[0].name
    throw new Error(`Rango: could not disambiguate Stellar chain ${caipChainId}`)
  }

  throw new Error(
    `Rango: unsupported CAIP chain namespace "${chainNamespace}" (${caipChainId}). See https://docs.rango.exchange/integrations`
  )
}
