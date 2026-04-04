import * as Sentry from '@sentry/react'
import { Buffer } from 'buffer/'
import mixpanel from 'mixpanel-browser'
import * as ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import { isUserCancellation } from '@/utils/walletErrors'

import App from './app/app'

// Polyfill Buffer for Solana SDK (buffer package vs DOM BufferConstructor types differ)
const rootWindow = window as typeof window & { Buffer: typeof Buffer }
rootWindow.Buffer = Buffer

const isProduction = import.meta.env.PROD

// Initialize Sentry (production only)
if (isProduction) {
  Sentry.init({
    dsn: 'https://95ef4505bd9dcacd40018abe1948c017@o4511162959724544.ingest.us.sentry.io/4511162970341376',
    sendDefaultPii: false,
    enableLogs: true,
    beforeSend(event, hint) {
      const error = hint.originalException
      if (isUserCancellation(error)) {
        return null
      }

      return event
    },
  })
}

// Initialize Mixpanel (disabled in dev unless VITE_ENABLE_ANALYTICS is set)
const analyticsEnabled = isProduction || import.meta.env.VITE_ENABLE_ANALYTICS === 'true'

if (analyticsEnabled) {
  mixpanel.init('c7ded934ffc012d90c2c3f3f2e8fd8aa', {
    debug: !isProduction,
    track_pageview: false,
    persistence: 'localStorage',
    autocapture: false,
  })
}

// Request persistent storage to prevent browser eviction of IndexedDB data
void navigator.storage?.persist?.()

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)

root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
)
