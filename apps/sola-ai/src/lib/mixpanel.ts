import mixpanel from 'mixpanel-browser'

const isProduction = import.meta.env.PROD
const analyticsEnabled = isProduction || import.meta.env.VITE_ENABLE_ANALYTICS === 'true'

// Type-safe event tracking (no-ops when analytics is disabled)
export const analytics = {
  identify: (userId: string, properties?: Record<string, unknown>) => {
    if (!analyticsEnabled) return
    mixpanel.identify(userId)
    if (properties) {
      mixpanel.people.set(properties)
    }
  },

  reset: () => {
    if (!analyticsEnabled) return
    mixpanel.reset()
  },

  trackWalletConnect: (props: { address: string; walletType: 'evm' | 'solana' }) => {
    if (!analyticsEnabled) return
    mixpanel.track('Wallet Connect', props)
  },

  trackSwap: (props: {
    sellAsset: string
    buyAsset: string
    sellAmount: string
    buyAmount: string
    network: string
  }) => {
    if (!analyticsEnabled) return
    mixpanel.track('Swap', props)
  },

  trackSend: (props: { asset: string; amount: string; network: string }) => {
    if (!analyticsEnabled) return
    mixpanel.track('Send', props)
  },

  trackChatMessage: () => {
    if (!analyticsEnabled) return
    mixpanel.track('Chat Message Sent')
  },
}
