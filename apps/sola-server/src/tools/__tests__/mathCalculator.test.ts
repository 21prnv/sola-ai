import { describe, expect, test } from 'bun:test'

import { mathCalculator } from '../mathCalculator'

describe('mathCalculator', () => {
  test('evaluates a valid expression', () => {
    const out = mathCalculator.execute({ expression: '2 + 3 * 4' })
    expect(out.result).toBe('14')
    expect(out.expression).toBe('2 + 3 * 4')
  })

  test('respects precision when provided', () => {
    const out = mathCalculator.execute({ expression: '10 / 3', precision: 4 })
    expect(out.result).toBe('3.3333')
  })

  test('rejects expressions longer than max length', () => {
    const long = '1' + '0'.repeat(1000)
    expect(() => mathCalculator.execute({ expression: long })).toThrow(/too long/)
  })

  test('rejects dangerous exponential patterns', () => {
    expect(() => mathCalculator.execute({ expression: '10^(9999)' })).toThrow(/expensive/)
  })

  test('rejects huge digit runs', () => {
    const huge = '0'.repeat(1000)
    expect(() => mathCalculator.execute({ expression: huge })).toThrow(/expensive/)
  })

  test('wraps invalid syntax in a clear error', () => {
    expect(() => mathCalculator.execute({ expression: '1 + +' })).toThrow(/Failed to evaluate/)
  })
})
