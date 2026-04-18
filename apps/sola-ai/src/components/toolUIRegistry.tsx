import type { ComponentType } from 'react'

import type { ToolName } from '@/types/toolOutput'

import { ApprovePolymarketUsdcUI } from './tools/ApprovePolymarketUsdcUI'
import { BuildPolymarketApiKeyRequestUI } from './tools/BuildPolymarketApiKeyRequestUI'
import { BuildPolymarketOrderUI } from './tools/BuildPolymarketOrderUI'
import { CancelPolymarketOrderUI } from './tools/CancelPolymarketOrderUI'
import { CheckWalletCapabilitiesUI } from './tools/CheckWalletCapabilitiesUI'
import { GasTrackerUI } from './tools/GasTrackerUI'
import { GetAccountUI } from './tools/GetAccountUI'
import { GetAllowanceUI } from './tools/GetAllowanceUI'
import { GetAssetPricesUI } from './tools/GetAssetPricesUI'
import { GetAssetsUI } from './tools/GetAssetsUI'
import { GetPolymarketOrdersUI } from './tools/GetPolymarketOrdersUI'
import { GetPolymarketPositionsUI } from './tools/GetPolymarketPositionsUI'
import { GetPolymarketPriceUI } from './tools/GetPolymarketPriceUI'
import { GetTransactionHistoryUI } from './tools/GetTransactionHistoryUI'
import { HistoricalPricesUI } from './tools/HistoricalPricesUI'
import { InitiateSwapUI } from './tools/InitiateSwapUI'
import { ListContactsUI } from './tools/ListContactsUI'
import { NewCoinsUI } from './tools/NewCoinsUI'
import { PortfolioPnlUI } from './tools/PortfolioPnlUI'
import { PortfolioUI } from './tools/PortfolioUI'
import { ReceiveUI } from './tools/ReceiveUI'
import { RevokeApprovalUI } from './tools/RevokeApprovalUI'
import { SaveContactUI } from './tools/SaveContactUI'
import { SearchPolymarketMarketsUI } from './tools/SearchPolymarketMarketsUI'
import { SendUI } from './tools/SendUI'
import { SwitchNetworkUI } from './tools/SwitchNetworkUI'
import type { ToolRendererProps, ToolUIComponentProps } from './tools/toolUIHelpers'
import { TopGainersLosersUI } from './tools/TopGainersLosersUI'
import { TrendingTokensUI } from './tools/TrendingTokensUI'
import { VaultDepositUI } from './tools/VaultDepositUI'
import { VaultWithdrawAllUI } from './tools/VaultWithdrawAllUI'
import { VaultWithdrawUI } from './tools/VaultWithdrawUI'

type ToolUIEntry<K extends ToolName> = {
  component: ComponentType<ToolUIComponentProps<K>> | null
  displayName: string
}

type ToolUIComponentMap = {
  [K in ToolName]: ToolUIEntry<K>
}

const TOOL_UI_REGISTRY: ToolUIComponentMap = {
  sendTool: { component: SendUI, displayName: 'Send' },
  initiateSwapTool: { component: InitiateSwapUI, displayName: 'Swap' },
  initiateSwapUsdTool: { component: InitiateSwapUI, displayName: 'Swap' },
  switchNetworkTool: { component: SwitchNetworkUI, displayName: 'Switch Network' },
  portfolioTool: { component: PortfolioUI, displayName: 'Portfolio' },
  getAssetsTool: { component: GetAssetsUI, displayName: 'Get Assets' },
  getAssetPricesTool: { component: GetAssetPricesUI, displayName: 'Asset Prices' },
  lookupExternalAddress: { component: GetAccountUI, displayName: 'Lookup Address' },
  transactionHistoryTool: { component: GetTransactionHistoryUI, displayName: 'Transaction History' },
  getAllowanceTool: { component: GetAllowanceUI, displayName: 'Get Allowance' },
  receiveTool: { component: ReceiveUI, displayName: 'Receive' },
  getTrendingTokensTool: { component: TrendingTokensUI, displayName: 'Trending Tokens' },
  getTopGainersLosersTool: { component: TopGainersLosersUI, displayName: 'Top Gainers & Losers' },
  getNewCoinsTool: { component: NewCoinsUI, displayName: 'New Coins' },
  getHistoricalPricesTool: { component: HistoricalPricesUI, displayName: 'Historical Prices' },
  checkWalletCapabilitiesTool: { component: CheckWalletCapabilitiesUI, displayName: 'Wallet Capabilities' },
  gasTrackerTool: { component: GasTrackerUI, displayName: 'Gas Tracker' },
  revokeApprovalTool: { component: RevokeApprovalUI, displayName: 'Revoke Approval' },
  saveContactTool: { component: SaveContactUI, displayName: 'Save Contact' },
  listContactsTool: { component: ListContactsUI, displayName: 'Contacts' },
  portfolioPnlTool: { component: PortfolioPnlUI, displayName: 'Portfolio PnL' },
  vaultDepositTool: { component: VaultDepositUI, displayName: 'Vault Deposit' },
  vaultWithdrawTool: { component: VaultWithdrawUI, displayName: 'Vault Withdraw' },
  vaultWithdrawAllTool: { component: VaultWithdrawAllUI, displayName: 'Vault Withdraw All' },
  searchPolymarketMarketsTool: { component: SearchPolymarketMarketsUI, displayName: 'Polymarket Markets' },
  getPolymarketPriceTool: { component: GetPolymarketPriceUI, displayName: 'Polymarket Price' },
  approvePolymarketUsdcTool: { component: ApprovePolymarketUsdcUI, displayName: 'Approve USDC' },
  buildPolymarketApiKeyRequestTool: { component: BuildPolymarketApiKeyRequestUI, displayName: 'Polymarket API Key' },
  createPolymarketApiKeyTool: { component: null, displayName: 'Polymarket API Key' },
  buildPolymarketOrderTool: { component: BuildPolymarketOrderUI, displayName: 'Polymarket Order' },
  submitPolymarketOrderTool: { component: null, displayName: 'Submit Order' },
  cancelPolymarketOrderTool: { component: CancelPolymarketOrderUI, displayName: 'Cancel Order' },
  getPolymarketOrdersTool: { component: GetPolymarketOrdersUI, displayName: 'Open Orders' },
  getPolymarketPositionsTool: { component: GetPolymarketPositionsUI, displayName: 'Positions' },
}

export function getToolUIComponent(toolName: string): ComponentType<ToolRendererProps> | null | undefined {
  const entry = TOOL_UI_REGISTRY[toolName as ToolName]
  return entry?.component as ComponentType<ToolRendererProps> | null | undefined
}

export function getToolDisplayName(toolName: string): string {
  return TOOL_UI_REGISTRY[toolName as ToolName]?.displayName ?? toolName
}
