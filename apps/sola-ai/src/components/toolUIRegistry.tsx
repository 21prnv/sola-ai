import type { ComponentType } from 'react'

import type { ToolName } from '@/types/toolOutput'

import { CheckWalletCapabilitiesUI } from './tools/CheckWalletCapabilitiesUI'
import { GetAccountUI } from './tools/GetAccountUI'
import { GetAllowanceUI } from './tools/GetAllowanceUI'
import { GetAssetsUI } from './tools/GetAssetsUI'
import { GetTransactionHistoryUI } from './tools/GetTransactionHistoryUI'
import { InitiateSwapUI } from './tools/InitiateSwapUI'
import { NewCoinsUI } from './tools/NewCoinsUI'
import { PortfolioUI } from './tools/PortfolioUI'
import { ReceiveUI } from './tools/ReceiveUI'
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
  lookupExternalAddress: { component: GetAccountUI, displayName: 'Lookup Address' },
  transactionHistoryTool: { component: GetTransactionHistoryUI, displayName: 'Transaction History' },
  getAllowanceTool: { component: GetAllowanceUI, displayName: 'Get Allowance' },
  receiveTool: { component: ReceiveUI, displayName: 'Receive' },
  getTrendingTokensTool: { component: TrendingTokensUI, displayName: 'Trending Tokens' },
  getTopGainersLosersTool: { component: TopGainersLosersUI, displayName: 'Top Gainers & Losers' },
  getNewCoinsTool: { component: NewCoinsUI, displayName: 'New Coins' },
  checkWalletCapabilitiesTool: { component: CheckWalletCapabilitiesUI, displayName: 'Wallet Capabilities' },
  vaultDepositTool: { component: VaultDepositUI, displayName: 'Vault Deposit' },
  vaultWithdrawTool: { component: VaultWithdrawUI, displayName: 'Vault Withdraw' },
  vaultWithdrawAllTool: { component: VaultWithdrawAllUI, displayName: 'Vault Withdraw All' },
}

export function getToolUIComponent(toolName: string): ComponentType<ToolRendererProps> | null | undefined {
  const entry = TOOL_UI_REGISTRY[toolName as ToolName]
  return entry?.component as ComponentType<ToolRendererProps> | null | undefined
}

export function getToolDisplayName(toolName: string): string {
  return TOOL_UI_REGISTRY[toolName as ToolName]?.displayName ?? toolName
}
