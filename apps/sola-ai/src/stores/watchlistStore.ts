import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type WatchlistToken = {
  key: string
  symbol: string
  name?: string
  assetId?: string
  icon?: string
  network?: string
  pinnedAt: number
}

type AddWatchlistInput = {
  symbol: string
  name?: string
  assetId?: string
  icon?: string
  network?: string
}

interface WatchlistStore {
  tokens: WatchlistToken[]
  upsertToken: (token: AddWatchlistInput) => void
  removeToken: (key: string) => void
  removeBySymbol: (symbol: string) => void
  isPinned: (key: string) => boolean
}

function toKey(symbol: string, network?: string, assetId?: string): string {
  if (assetId?.trim()) return `asset:${assetId.toLowerCase()}`
  const normalizedSymbol = symbol.trim().toUpperCase()
  const normalizedNetwork = network?.trim().toLowerCase()
  return normalizedNetwork ? `symbol:${normalizedSymbol}:${normalizedNetwork}` : `symbol:${normalizedSymbol}`
}

export function buildWatchlistKey(symbol: string, network?: string, assetId?: string): string {
  return toKey(symbol, network, assetId)
}

export const useWatchlistStore = create<WatchlistStore>()(
  persist(
    (set, get) => ({
      tokens: [],
      upsertToken: token =>
        set(state => {
          const key = toKey(token.symbol, token.network, token.assetId)
          const existingIndex = state.tokens.findIndex(item => item.key === key)
          const base: WatchlistToken = {
            key,
            symbol: token.symbol.trim().toUpperCase(),
            name: token.name,
            assetId: token.assetId,
            icon: token.icon,
            network: token.network,
            pinnedAt: Date.now(),
          }

          if (existingIndex >= 0) {
            const existing = state.tokens[existingIndex]
            const updated = [...state.tokens]
            updated[existingIndex] = {
              ...existing,
              ...base,
              pinnedAt: existing?.pinnedAt ?? base.pinnedAt,
            }
            return { tokens: updated }
          }

          return { tokens: [base, ...state.tokens] }
        }),
      removeToken: key =>
        set(state => ({
          tokens: state.tokens.filter(item => item.key !== key),
        })),
      removeBySymbol: symbol =>
        set(state => ({
          tokens: state.tokens.filter(item => item.symbol !== symbol.trim().toUpperCase()),
        })),
      isPinned: key => get().tokens.some(item => item.key === key),
    }),
    {
      name: 'watchlist-store',
      version: 1,
      storage: createJSONStorage(() => localStorage),
    }
  )
)
