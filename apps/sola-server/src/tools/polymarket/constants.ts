export const POLYGON_CHAIN_ID_NUMERIC = 137
export const POLYGON_CAIP_CHAIN_ID = 'eip155:137'

export const POLYMARKET_CONTRACTS = {
  usdc: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
  ctfExchange: '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E',
  negRiskCtfExchange: '0xC5d563A36AE78145C45a50134d48A1215220f80a',
  ctf: '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045',
} as const

export const USDC_DECIMALS = 6

export const CLOB_BASE_URL = 'https://clob.polymarket.com'

export const POLYMARKET_EIP712_DOMAIN = {
  name: 'Polymarket CTF Exchange',
  version: '1',
  chainId: POLYGON_CHAIN_ID_NUMERIC,
} as const

export const POLYMARKET_NEG_RISK_EIP712_DOMAIN = {
  name: 'Polymarket CTF Exchange',
  version: '1.0',
  chainId: POLYGON_CHAIN_ID_NUMERIC,
} as const

export const POLYMARKET_ORDER_TYPES = {
  Order: [
    { name: 'salt', type: 'uint256' },
    { name: 'maker', type: 'address' },
    { name: 'signer', type: 'address' },
    { name: 'taker', type: 'address' },
    { name: 'tokenId', type: 'uint256' },
    { name: 'makerAmount', type: 'uint256' },
    { name: 'takerAmount', type: 'uint256' },
    { name: 'expiration', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'feeRateBps', type: 'uint256' },
    { name: 'side', type: 'uint8' },
    { name: 'signatureType', type: 'uint8' },
  ],
} as const

export enum OrderSide {
  BUY = 0,
  SELL = 1,
}

export enum SignatureType {
  EOA = 0,
  POLY_PROXY = 1,
  POLY_GNOSIS_SAFE = 2,
}
