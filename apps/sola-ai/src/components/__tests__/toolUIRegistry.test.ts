import { describe, expect, it } from 'bun:test'

import { getToolDisplayName } from '../toolUIRegistry'

describe('getToolDisplayName', () => {
  it('returns display name for a known tool', () => {
    expect(getToolDisplayName('sendTool')).toBe('Send')
  })

  it('returns display name for another known tool', () => {
    expect(getToolDisplayName('portfolioTool')).toBe('Portfolio')
  })

  it('returns the raw tool name for an unknown tool', () => {
    expect(getToolDisplayName('someUnknownTool')).toBe('someUnknownTool')
  })
})
