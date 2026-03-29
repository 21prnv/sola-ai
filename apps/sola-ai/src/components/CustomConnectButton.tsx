import { isEthereumWallet } from '@dynamic-labs/ethereum'
import { useDynamicContext, useProjectSettings, useUserWallets } from '@dynamic-labs/sdk-react-core'
import { isSolanaWallet } from '@dynamic-labs/solana'
import { NETWORK_ICONS } from '@sola-ai/utils'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useChainId } from 'wagmi'

import { SOLANA_CAIP_ID } from '@/lib/chains'
import { canOpenDynamicAuthFlow } from '@/lib/dynamicWalletConnect'
import { truncateAddress } from '@/lib/utils'

import { Button } from './ui/Button'

type CustomConnectButtonProps = {
  onConnectedClick?: () => void
}

export const CustomConnectButton = ({ onConnectedClick }: CustomConnectButtonProps) => {
  const { setShowAuthFlow, primaryWallet, handleLogOut, sdkHasLoaded } = useDynamicContext()
  const projectSettings = useProjectSettings()
  const userWallets = useUserWallets()
  const chainId = useChainId()
  const hasTriggeredResetRef = useRef(false)

  // Auto-detect and fix corrupted Dynamic state
  // Corrupted state: userWallets has data but user/primaryWallet are null, SDK stuck loading
  // Wait 2s to allow normal init to complete before resetting
  useEffect(() => {
    if (!sdkHasLoaded && userWallets.length > 0 && !primaryWallet) {
      if (hasTriggeredResetRef.current) return

      const timer = setTimeout(() => {
        hasTriggeredResetRef.current = true
        void handleLogOut()
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [sdkHasLoaded, userWallets, primaryWallet, handleLogOut])

  // Reset flag when user successfully authenticates
  useEffect(() => {
    if (sdkHasLoaded && primaryWallet) {
      hasTriggeredResetRef.current = false
    }
  }, [sdkHasLoaded, primaryWallet])

  const handleConnect = useCallback(() => {
    if (
      !canOpenDynamicAuthFlow({
        environmentId: import.meta.env.VITE_DYNAMIC_ENVIRONMENT_ID,
        sdkHasLoaded,
        projectSettings,
      })
    ) {
      return
    }
    setShowAuthFlow(true)
  }, [setShowAuthFlow, sdkHasLoaded, projectSettings])

  const handleOpenAccount = useCallback(() => {
    if (onConnectedClick) {
      onConnectedClick()
    }
  }, [onConnectedClick])

  const address = primaryWallet?.address
  const truncatedAddress = useMemo(() => (address ? truncateAddress(address) : ''), [address])

  const walletIcon = primaryWallet?.connector?.metadata?.icon
  const walletName = useMemo(() => primaryWallet?.connector?.name, [primaryWallet?.connector?.name])

  const isPrimarySolana = useMemo(() => primaryWallet && isSolanaWallet(primaryWallet), [primaryWallet])

  const caipChainId = useMemo(() => {
    if (!primaryWallet) return undefined
    if (isPrimarySolana) return SOLANA_CAIP_ID
    if (isEthereumWallet(primaryWallet)) {
      return chainId ? `eip155:${chainId}` : undefined
    }
    return undefined
  }, [primaryWallet, isPrimarySolana, chainId])

  const networkIcon = useMemo(() => (caipChainId ? NETWORK_ICONS[caipChainId] : undefined), [caipChainId])

  if (!primaryWallet) {
    return (
      <Button onClick={handleConnect} variant="default" disabled={!sdkHasLoaded}>
        {!sdkHasLoaded ? 'Loading wallet…' : 'Connect Wallet'}
      </Button>
    )
  }

  return (
    <Button onClick={handleOpenAccount} variant="wallet" className="gap-2">
      <div className="relative w-6 h-6">
        {walletIcon && <img src={walletIcon} alt={walletName || 'Wallet'} className="w-6 h-6 rounded-full" />}
        {networkIcon && (
          <img
            src={networkIcon}
            alt="Network"
            className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border border-gray-800"
          />
        )}
      </div>
      <span className="text-sm">{truncatedAddress}</span>
    </Button>
  )
}
