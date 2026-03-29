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

import { useWalletAnalytics } from '@/hooks/useWalletAnalytics'
import { DYNAMIC_EVM_NETWORKS } from '@/lib/chains'
import { wagmiConfig } from '@/lib/wagmi-config'

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

  useEffect(() => {
    if (!import.meta.env.VITE_DYNAMIC_ENVIRONMENT_ID?.trim()) {
      console.error(
        '[Sola] VITE_DYNAMIC_ENVIRONMENT_ID is missing. The Connect Wallet button cannot open Dynamic until it is set in Sola-AI/.env and the dev server is restarted.'
      )
    }
  }, [])

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/chats" replace />} />
      <Route path="/chats" element={<Dashboard />} />
      <Route path="/chats/:conversationId" element={<Dashboard />} />
    </Routes>
  )
}

function App() {
  return (
    <DynamicContextProvider
      theme="dark"
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
            <Toaster
              theme="dark"
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
