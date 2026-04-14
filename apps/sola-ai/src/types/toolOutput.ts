import type {
  ApprovePolymarketUsdcOutput,
  AssetWithMarketData,
  BuildPolymarketApiKeyRequestOutput,
  BuildPolymarketOrderOutput,
  CancelPolymarketOrderOutput,
  CheckWalletCapabilitiesOutput,
  CreatePolymarketApiKeyOutput,
  GasTrackerOutput,
  GetAssetPricesOutput,
  GetHistoricalPricesOutput,
  GetPolymarketOrdersOutput,
  GetPolymarketPositionsOutput,
  GetPolymarketPriceOutput,
  InitiateSwapOutput,
  ListContactsOutput,
  PortfolioOutput,
  PortfolioPnlOutput,
  ReceiveOutput,
  RevokeApprovalOutput,
  SaveContactOutput,
  SearchPolymarketMarketsOutput,
  SendOutput,
  SubmitPolymarketOrderOutput,
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
  portfolioPnlTool: PortfolioPnlOutput
  getAssetsTool: { assets: AssetWithMarketData[] }
  getAssetPricesTool: GetAssetPricesOutput
  lookupExternalAddress: never
  transactionHistoryTool: { transactions?: ParsedTransaction[]; metadata?: { networksChecked?: string[] } }
  getAllowanceTool: unknown
  receiveTool: ReceiveOutput
  gasTrackerTool: GasTrackerOutput
  revokeApprovalTool: RevokeApprovalOutput
  saveContactTool: SaveContactOutput
  listContactsTool: ListContactsOutput
  getTrendingTokensTool: { tokens: TrimmedTrendingCoin[] }
  getTopGainersLosersTool: { gainers: TrimmedGainerLoserCoin[]; losers: TrimmedGainerLoserCoin[]; duration: string }
  getNewCoinsTool: { coins: TrimmedNewCoin[] }
  getHistoricalPricesTool: GetHistoricalPricesOutput
  checkWalletCapabilitiesTool: CheckWalletCapabilitiesOutput
  vaultDepositTool: VaultDepositOutput
  vaultWithdrawTool: VaultWithdrawOutput
  vaultWithdrawAllTool: VaultWithdrawAllOutput
  searchPolymarketMarketsTool: SearchPolymarketMarketsOutput
  getPolymarketPriceTool: GetPolymarketPriceOutput
  approvePolymarketUsdcTool: ApprovePolymarketUsdcOutput
  buildPolymarketApiKeyRequestTool: BuildPolymarketApiKeyRequestOutput
  createPolymarketApiKeyTool: CreatePolymarketApiKeyOutput
  buildPolymarketOrderTool: BuildPolymarketOrderOutput
  submitPolymarketOrderTool: SubmitPolymarketOrderOutput
  cancelPolymarketOrderTool: CancelPolymarketOrderOutput
  getPolymarketOrdersTool: GetPolymarketOrdersOutput
  getPolymarketPositionsTool: GetPolymarketPositionsOutput
}

export type ToolName = keyof ToolOutputMap
