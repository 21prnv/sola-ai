import { describe, expect, test } from 'bun:test'

import { solaAIKnowledge } from '../../knowledge/solaai'
import { executeGetSolaAIKnowledge } from '../getSolaAIKnowledge'

const CATEGORIES = [
  'company',
  'platform',
  'swappers',
  'chains',
  'staking',
  'features',
  'mobile-app',
] as const satisfies readonly (keyof typeof solaAIKnowledge)[]

describe('executeGetSolaAIKnowledge', () => {
  test('every category returns non-empty markdown', () => {
    for (const category of CATEGORIES) {
      const text = executeGetSolaAIKnowledge({ category })
      expect(text.trim().length).toBeGreaterThan(0)
    }
  })

  test('category "all" includes every knowledge section', () => {
    const all = executeGetSolaAIKnowledge({ category: 'all' })
    for (const category of CATEGORIES) {
      expect(all).toContain(category.toUpperCase())
      const slice = solaAIKnowledge[category].slice(0, 40)
      expect(all).toContain(slice)
    }
  })

  test('default (no category) matches "all"', () => {
    expect(executeGetSolaAIKnowledge({})).toBe(executeGetSolaAIKnowledge({ category: 'all' }))
  })

  test('solaAIKnowledge keys stay aligned with tool categories', () => {
    const keys = new Set(Object.keys(solaAIKnowledge) as (keyof typeof solaAIKnowledge)[])
    for (const c of CATEGORIES) {
      expect(keys.has(c)).toBe(true)
    }
  })
})
