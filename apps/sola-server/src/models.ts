import { createOpenAI } from '@ai-sdk/openai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import type { LanguageModelV2 } from '@ai-sdk/provider'

/** Lazily built so `OPENAI_API_KEY` is read after Bun loads `--env-file` (same pattern as Venice). */
let openaiProvider: ReturnType<typeof createOpenAI> | undefined

function getOpenAIProvider() {
  if (!openaiProvider) {
    const apiKey = process.env.OPENAI_API_KEY?.trim()
    if (!apiKey) {
      throw new Error(
        '[AI] OPENAI_API_KEY is missing or empty. Set it in Sola-AI/.env at the repo root (server uses bun --env-file=../../.env).'
      )
    }
    openaiProvider = createOpenAI({ apiKey })
  }
  return openaiProvider
}

let veniceProvider: ReturnType<typeof createOpenAICompatible> | undefined

function getVeniceProvider() {
  if (!veniceProvider) {
    const apiKey = process.env.VENICE_API_KEY?.trim()
    if (!apiKey) {
      throw new Error('[AI] VENICE_API_KEY is missing when AI_PROVIDER=venice.')
    }
    veniceProvider = createOpenAICompatible({
      name: 'venice',
      baseURL: 'https://api.venice.ai/api/v1',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })
  }
  return veniceProvider
}

export type AIProvider = 'openai' | 'venice'

/**
 * Resolve env AI_PROVIDER. Legacy google/gemini/anthropic/glm map to OpenAI.
 */
export function resolveAIProvider(): AIProvider {
  const raw = (process.env.AI_PROVIDER || 'openai').toLowerCase().trim()
  if (raw === 'anthropic' || raw === 'claude') {
    console.warn(
      '[AI] AI_PROVIDER=anthropic/claude is not wired in models.ts; using openai (GPT). Set AI_PROVIDER=openai and OPENAI_API_KEY.'
    )
    return 'openai'
  }
  if (raw === 'glm') {
    console.warn('[AI] AI_PROVIDER=glm is no longer supported; using openai. Set AI_PROVIDER=openai.')
    return 'openai'
  }
  if (raw === 'google' || raw === 'gemini') {
    console.warn(
      '[AI] Google Gemini was removed; using openai (gpt-3.5-turbo). Set AI_PROVIDER=openai and OPENAI_API_KEY.'
    )
    return 'openai'
  }
  if (raw === 'venice') return 'venice'
  if (raw === 'openai') return 'openai'
  console.warn(`[AI] Unknown AI_PROVIDER="${process.env.AI_PROVIDER}", using openai`)
  return 'openai'
}

/**
 * @deprecated Prefer resolveAIProvider — kept for chat route compatibility.
 */
export function getProviderName(): AIProvider {
  return resolveAIProvider()
}

/**
 * Chat model for streamText. Defaults to OpenAI `gpt-3.5-turbo`.
 */
export function getModel(): LanguageModelV2 {
  const provider = resolveAIProvider()

  if (provider === 'venice') {
    const modelId = 'grok-41-fast'
    console.log(`[AI] Using provider: venice, model: ${modelId}`)
    return getVeniceProvider()(modelId)
  }

  const modelId = (process.env.OPENAI_MODEL || 'gpt-3.5-turbo').trim()
  console.log(`[AI] Using provider: openai, model: ${modelId}`)
  return getOpenAIProvider()(modelId)
}
