import { z } from 'zod'

import { solaAIKnowledge } from '../knowledge/solaai'

const CATEGORIES = [
  'company',
  'platform',
  'swappers',
  'chains',
  'staking',
  'fox-token',
  'features',
  'mobile-app',
] as const

export const getSolaAIKnowledgeSchema = z.object({
  category: z
    .enum(['company', 'platform', 'swappers', 'chains', 'staking', 'fox-token', 'features', 'mobile-app', 'all'])
    .optional()
    .describe(
      'The category of knowledge to retrieve. If not specified, will try to return relevant information based on context.'
    ),
})

export type GetSolaAIKnowledgeInput = z.infer<typeof getSolaAIKnowledgeSchema>

export function executeGetSolaAIKnowledge(input: GetSolaAIKnowledgeInput): string {
  const { category } = input
  const selectedCategory = category || 'all'

  if (selectedCategory === 'all') {
    return CATEGORIES.map(cat => `\n\n# ${cat.toUpperCase()} #\n\n${solaAIKnowledge[cat]}`).join('\n\n---\n\n')
  }

  return solaAIKnowledge[selectedCategory]
}

export const getSolaAIKnowledgeTool = {
  description: 'Get Sola AI platform info. No UI card - format and present the information in your response.',
  inputSchema: getSolaAIKnowledgeSchema,
  execute: executeGetSolaAIKnowledge,
}
