import { BitcoinWalletConnectors } from '@dynamic-labs/bitcoin'
import { CosmosWalletConnectors } from '@dynamic-labs/cosmos'
import { EthereumWalletConnectors } from '@dynamic-labs/ethereum'
import { DynamicContextProvider, mergeNetworks } from '@dynamic-labs/sdk-react-core'
import { SolanaWalletConnectors } from '@dynamic-labs/solana'
import { StarknetWalletConnectors } from '@dynamic-labs/starknet'
import { SuiWalletConnectors } from '@dynamic-labs/sui'
import { TronWalletConnectors } from '@dynamic-labs/tron'
import { DynamicWagmiConnector } from '@dynamic-labs/wagmi-connector'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { WagmiProvider } from 'wagmi'

import { OnboardingTour } from '@/components/OnboardingTour'
import { useWalletAnalytics } from '@/hooks/useWalletAnalytics'
import { DYNAMIC_EVM_NETWORKS } from '@/lib/chains'
import { wagmiConfig } from '@/lib/wagmi-config'
import { useThemeStore } from '@/stores/themeStore'

import { Dashboard } from './dashboard/page'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      gcTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
})

function AppContent() {
  useWalletAnalytics()
  const { mode, theme } = useThemeStore()

  useEffect(() => {
    if (!import.meta.env.VITE_DYNAMIC_ENVIRONMENT_ID?.trim()) {
      console.error(
        '[Sola] VITE_DYNAMIC_ENVIRONMENT_ID is missing. The Connect Wallet button cannot open Dynamic until it is set in Sola-AI/.env and the dev server is restarted.'
      )
    }
  }, [])

  useEffect(() => {
    const html = document.documentElement
    html.className = `${mode}${theme !== 'default' ? ` ${theme}` : ''}`
  }, [mode, theme])

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/chats" replace />} />
      <Route path="/chats" element={<Dashboard />} />
      <Route path="/chats/:conversationId" element={<Dashboard />} />
    </Routes>
  )
}

function App() {
  const dynamicTheme = useThemeStore(s => s.mode)

  return (
    <DynamicContextProvider
      theme={dynamicTheme}
      settings={{
        environmentId: import.meta.env.VITE_DYNAMIC_ENVIRONMENT_ID,
        walletConnectors: [
          EthereumWalletConnectors,
          SolanaWalletConnectors,
          BitcoinWalletConnectors,
          CosmosWalletConnectors,
          StarknetWalletConnectors,
          SuiWalletConnectors,
          TronWalletConnectors,
        ],
        initialAuthenticationMode: 'connect-only',
        overrides: {
          evmNetworks: dashboardNetworks => {
            return mergeNetworks(DYNAMIC_EVM_NETWORKS, dashboardNetworks)
          },
        },
      }}
    >
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <DynamicWagmiConnector>
            <AppContent />
            <OnboardingTour />
            <Toaster
              theme={dynamicTheme}
              closeButton
              toastOptions={{
                classNames: {
                  closeButton: '!right-0 !left-auto !translate-x-[50%] !-translate-y-[25%]',
                },
              }}
            />
          </DynamicWagmiConnector>
        </QueryClientProvider>
      </WagmiProvider>
    </DynamicContextProvider>
  )
}

export default App
