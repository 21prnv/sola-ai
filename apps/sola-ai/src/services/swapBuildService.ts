import type { InitiateSwapOutput } from '@sola-ai/server'
import { fetchWithTimeout } from '@sola-ai/utils'

import { getSolaServerBaseUrl } from '@/lib/serverBaseUrl'

export type SwapBuildWalletPayload = {
  evmAddress?: string
  solanaAddress?: string
  approvedChainIds?: string[]
  safeAddress?: string
  safeDeploymentState?: Record<
    string,
    {
      isDeployed: boolean
      modulesEnabled: boolean
      domainVerifierSet: boolean
      safeAddress: string
    }
  >
  dynamicMultichainAddresses?: Record<string, string>
  registryOrders?: unknown[]
  knownTransactions?: unknown[]
}

export async function fetchSwapBuild(
  wallet: SwapBuildWalletPayload,
  params: {
    sellAsset: { symbolOrName: string; network?: string }
    buyAsset: { symbolOrName: string; network?: string }
    sellAmount: string
    selectedSwapperId: string
    slippagePercent?: number
  }
): Promise<InitiateSwapOutput> {
  const base = getSolaServerBaseUrl()
  const res = await fetchWithTimeout(`${base}/api/swap/build`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    timeoutMs: 30_000,
    body: JSON.stringify({
      ...wallet,
      sellAsset: params.sellAsset,
      buyAsset: params.buyAsset,
      sellAmount: params.sellAmount,
      selectedSwapperId: params.selectedSwapperId,
      slippagePercent: params.slippagePercent,
    }),
  })

  const data = (await res.json()) as InitiateSwapOutput & { error?: string; message?: string }

  if (!res.ok) {
    throw new Error(data.message || data.error || `Swap build failed (${res.status})`)
  }

  if ('error' in data && data.error) {
    throw new Error(data.message || data.error)
  }

  return data
}
