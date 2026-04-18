import { getAddress } from 'viem'
import { z } from 'zod'

import { getAddressForChain, getSafeAddressForChain, isSafeDeployedOnChain } from '../../utils/walletContextSimple'
import type { WalletContext } from '../../utils/walletContextSimple'

import {
  POLYGON_CAIP_CHAIN_ID,
  POLYGON_CHAIN_ID_NUMERIC,
  POLYMARKET_CONTRACTS,
  POLYMARKET_EIP712_DOMAIN,
  POLYMARKET_NEG_RISK_EIP712_DOMAIN,
  POLYMARKET_ORDER_TYPES,
  OrderSide,
  SignatureType,
  USDC_DECIMALS,
} from './constants'

export const buildPolymarketOrderSchema = z.object({
  tokenId: z.string().describe('CLOB outcome token id (from searchPolymarketMarkets → outcomes[i].tokenId)'),
  side: z.enum(['BUY', 'SELL']).describe('BUY to go long the outcome, SELL to close or short'),
  price: z.number().min(0.001).max(0.999).describe('Limit price per share in USDC (0.001–0.999, e.g. 0.62 = 62¢)'),
  size: z
    .number()
    .positive()
    .describe('Number of shares to trade (contracts). 1 share pays $1 if outcome resolves Yes.'),
  expirationSeconds: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Seconds from now until the order expires. 0 = good-til-cancelled (default).'),
  feeRateBps: z.number().int().min(0).max(1000).optional().describe('Maker fee rate in bps (default: 0)'),
  negRisk: z.boolean().optional().describe('Use the Neg-Risk CTF Exchange (default: false)'),
  useSafe: z.boolean().optional().describe('Route maker through the Safe vault on Polygon (default: false, uses EOA)'),
})

export type BuildPolymarketOrderInput = z.infer<typeof buildPolymarketOrderSchema>

export type PolymarketOrderStruct = {
  salt: string
  maker: string
  signer: string
  taker: string
  tokenId: string
  makerAmount: string
  takerAmount: string
  expiration: string
  nonce: string
  feeRateBps: string
  side: number
  signatureType: number
}

export type PolymarketTypedData = {
  domain: {
    name: string
    version: string
    chainId: number
    verifyingContract: string
  }
  types: typeof POLYMARKET_ORDER_TYPES
  primaryType: 'Order'
  message: PolymarketOrderStruct
}

export type BuildPolymarketOrderOutput = {
  summary: {
    side: 'BUY' | 'SELL'
    price: number
    size: number
    totalUsdc: number
    tokenId: string
    maker: string
    expiration: string
    negRisk: boolean
    useSafe: boolean
  }
  order: PolymarketOrderStruct
  typedData: PolymarketTypedData
}

function toBaseUnits6(value: number): bigint {
  return BigInt(Math.round(value * 10 ** USDC_DECIMALS))
}

function randomSalt(): string {
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  let val = 0
  for (const b of bytes) val = val * 256 + b
  return val.toString()
}

export async function executeBuildPolymarketOrder(
  input: BuildPolymarketOrderInput,
  walletContext?: WalletContext
): Promise<BuildPolymarketOrderOutput> {
  const eoa = getAddress(getAddressForChain(walletContext, POLYGON_CAIP_CHAIN_ID))
  const useSafe = input.useSafe ?? false

  let maker: string = eoa
  let signer: string = eoa
  let signatureType: number = SignatureType.EOA

  if (useSafe) {
    if (!isSafeDeployedOnChain(walletContext, POLYGON_CHAIN_ID_NUMERIC)) {
      throw new Error('Safe is not deployed on Polygon. Deploy a Safe vault first or set useSafe=false.')
    }
    const safeAddress = await getSafeAddressForChain(walletContext, POLYGON_CHAIN_ID_NUMERIC)
    if (!safeAddress) {
      throw new Error('No Safe vault address available on Polygon.')
    }
    maker = getAddress(safeAddress)
    signer = eoa
    signatureType = SignatureType.POLY_GNOSIS_SAFE
  }

  const side = input.side === 'BUY' ? OrderSide.BUY : OrderSide.SELL
  const negRisk = input.negRisk ?? false

  const sharesBaseUnits = toBaseUnits6(input.size)
  const usdcBaseUnits = toBaseUnits6(input.size * input.price)

  // BUY: spend USDC (makerAmount) to receive shares (takerAmount)
  // SELL: spend shares (makerAmount) to receive USDC (takerAmount)
  const makerAmount = side === OrderSide.BUY ? usdcBaseUnits : sharesBaseUnits
  const takerAmount = side === OrderSide.BUY ? sharesBaseUnits : usdcBaseUnits

  const expiration =
    input.expirationSeconds && input.expirationSeconds > 0
      ? BigInt(Math.floor(Date.now() / 1000) + input.expirationSeconds).toString()
      : '0'

  const order: PolymarketOrderStruct = {
    salt: randomSalt(),
    maker,
    signer,
    taker: '0x0000000000000000000000000000000000000000',
    tokenId: input.tokenId,
    makerAmount: makerAmount.toString(),
    takerAmount: takerAmount.toString(),
    expiration,
    nonce: '0',
    feeRateBps: String(input.feeRateBps ?? 0),
    side,
    signatureType,
  }

  const verifyingContract = negRisk ? POLYMARKET_CONTRACTS.negRiskCtfExchange : POLYMARKET_CONTRACTS.ctfExchange

  const domain = negRisk ? POLYMARKET_NEG_RISK_EIP712_DOMAIN : POLYMARKET_EIP712_DOMAIN

  const typedData: PolymarketTypedData = {
    domain: {
      name: domain.name,
      version: domain.version,
      chainId: domain.chainId,
      verifyingContract,
    },
    types: POLYMARKET_ORDER_TYPES,
    primaryType: 'Order',
    message: order,
  }

  return {
    summary: {
      side: input.side,
      price: input.price,
      size: input.size,
      totalUsdc: Math.round(input.size * input.price * 100) / 100,
      tokenId: input.tokenId,
      maker,
      expiration: expiration === '0' ? 'good-til-cancelled' : new Date(Number(expiration) * 1000).toISOString(),
      negRisk,
      useSafe,
    },
    order,
    typedData,
  }
}

export const buildPolymarketOrderTool = {
  description: `Build an unsigned Polymarket limit order with EIP-712 typed data for the client to sign.

Prerequisites:
1. User must have USDC on Polygon
2. USDC approval must exist (run approvePolymarketUsdc first if not)
3. Caller should have resolved the market's outcome tokenId via searchPolymarketMarkets

Prices are in USDC per share (0.001–0.999). BUY side spends USDC to acquire outcome shares.
After signing, call submitPolymarketOrder with the signature to send it to the CLOB orderbook.

UI CARD DISPLAYS: side, price, size, total USDC, expiration, and maker address.`,
  inputSchema: buildPolymarketOrderSchema,
  execute: executeBuildPolymarketOrder,
}
