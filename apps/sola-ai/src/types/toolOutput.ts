import type {
  AssetWithMarketData,
  CheckWalletCapabilitiesOutput,
  InitiateSwapOutput,
  PortfolioOutput,
  ReceiveOutput,
  SendOutput,
  SwitchNetworkOutput,
  TrimmedGainerLoserCoin,
  TrimmedNewCoin,
  TrimmedTrendingCoin,
  VaultDepositOutput,
  VaultWithdrawAllOutput,
  VaultWithdrawOutput,
} from '@sola-ai/server'
import type { ParsedTransaction } from '@sola-ai/types'

export type ToolOutputMap = {
  sendTool: SendOutput
  initiateSwapTool: InitiateSwapOutput
  initiateSwapUsdTool: InitiateSwapOutput
  switchNetworkTool: SwitchNetworkOutput
  portfolioTool: PortfolioOutput
  getAssetsTool: { assets: AssetWithMarketData[] }
  lookupExternalAddress: never
  transactionHistoryTool: { transactions?: ParsedTransaction[]; metadata?: { networksChecked?: string[] } }
  getAllowanceTool: unknown
  receiveTool: ReceiveOutput
  getTrendingTokensTool: { tokens: TrimmedTrendingCoin[] }
  getTopGainersLosersTool: { gainers: TrimmedGainerLoserCoin[]; losers: TrimmedGainerLoserCoin[]; duration: string }
  getNewCoinsTool: { coins: TrimmedNewCoin[] }
  checkWalletCapabilitiesTool: CheckWalletCapabilitiesOutput
  vaultDepositTool: VaultDepositOutput
  vaultWithdrawTool: VaultWithdrawOutput
  vaultWithdrawAllTool: VaultWithdrawAllOutput
}

export type ToolName = keyof ToolOutputMap
