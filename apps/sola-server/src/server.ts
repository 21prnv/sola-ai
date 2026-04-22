import util from 'util'

import { AssetService } from '@sola-ai/utils'
import { Hono } from 'hono'
import { cors } from 'hono/cors'

import { initializeAllAssetData, refreshAllAssetData } from './lib/assetInit'
import { handleChatRequest } from './routes/chat'
import { handleChatResumeRequest } from './routes/chatResume'
import { handlePortfolioRequest } from './routes/portfolio'
import { handleSwapBuildRequest } from './routes/swapBuild'

// Prevent console.log truncation of deep objects and large arrays
util.inspect.defaultOptions.depth = null
util.inspect.defaultOptions.maxArrayLength = null
util.inspect.defaultOptions.maxStringLength = null

console.log('Initializing asset data...')
try {
  await initializeAllAssetData()
  AssetService.setOnStale(refreshAllAssetData)
  console.log('Asset data initialized')
} catch (error) {
  console.error('Failed to initialize asset data:', error)
  process.exit(1)
}

const app = new Hono()

app.use(
  '/*',
  cors({
    origin: [
      'http://localhost:3000',
      'http://localhost:4200',
      'http://localhost:5173',
      'http://localhost:8787',
      'https://sola-aifrontend-production.up.railway.app',
      'https://solaai.in',
    ],
    credentials: true,
    allowHeaders: ['Authorization', 'Content-Type'],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
  })
)

app.get('/health', c => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.post('/api/chat', handleChatRequest)

app.get('/api/chat/resume/:conversationId', handleChatResumeRequest)

app.post('/api/portfolio', handlePortfolioRequest)

app.post('/api/swap/build', handleSwapBuildRequest)

app.notFound(c => {
  return c.json({ error: 'Not found' }, 404)
})

app.onError((err, c) => {
  const errorId = crypto.randomUUID()
  console.error('[Server Error]:', { errorId, name: err.name, message: err.message, stack: err.stack })
  return c.json({ error: 'Internal server error', errorId }, 500)
})

const port = Number(process.env.PORT) || 8787

console.log(`Server starting on port ${port}`)
console.log(`   API: /api/chat`)
console.log(`   API: /api/chat/resume/:conversationId`)
console.log(`   API: /api/portfolio`)
console.log(`   API: /api/swap/build`)
console.log(`   Health: /health`)

export default {
  fetch: app.fetch,
  port,
  // Increase timeout to handle exhaustive transaction history queries
  // which can take longer when fetching across multiple networks
  idleTimeout: 30,
}
