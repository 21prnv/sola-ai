import type { useChat } from '@ai-sdk/react'
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval'
import { produce, enableMapSet } from 'immer'
import { create } from 'zustand'
import type { StateStorage } from 'zustand/middleware'
import { persist, createJSONStorage } from 'zustand/middleware'

import type {
  ChainResult,
  SendMeta,
  SwapMeta,
  ToolExecutionState,
  VaultDepositMeta,
  VaultWithdrawAllMeta,
} from '@/lib/executionState'
import type { Conversation } from '@/types'

enableMapSet()

// Mirrors KnownTransaction from agentic-server/src/utils/walletContextSimple.ts
export interface KnownTransaction {
  txHash: string
  type: 'swap' | 'send' | 'limitOrder' | 'stopLoss' | 'twap' | 'deposit' | 'withdraw' | 'approval'
  sellSymbol?: string
  sellAmount?: string
  buySymbol?: string
  buyAmount?: string
  network?: string
}

const CONVERSATIONS_BACKUP_KEY = 'sola-ai-chat-conversations-backup'

let hydrationVerified = false

const idbStorage: StateStorage = {
  getItem: async name => {
    try {
      return (await idbGet(name)) ?? null
    } catch (e) {
      console.error('[chatStore] IDB getItem failed:', e)
      return null
    }
  },
  setItem: async (name, value) => {
    if (!hydrationVerified) {
      console.warn('[chatStore] Blocked IDB write before hydration verified')
      return
    }
    try {
      await idbSet(name, value)
      try {
        const parsed = JSON.parse(value)
        const conversations = parsed?.state?.conversations
        if (Array.isArray(conversations) && conversations.length > 0) {
          localStorage.setItem(CONVERSATIONS_BACKUP_KEY, JSON.stringify(conversations))
        }
      } catch {
        // parsing failure is non-critical
      }
    } catch (e) {
      console.error('[chatStore] IDB setItem failed:', e)
    }
  },
  removeItem: async name => {
    try {
      await idbDel(name)
    } catch (e) {
      console.error('[chatStore] IDB removeItem failed:', e)
    }
  },
}

export const STORE_VERSION = 4
export const MAX_MESSAGES_PER_CONVERSATION = 500

type ChatMessage = ReturnType<typeof useChat>['messages'][number]

interface ChatState {
  conversations: Conversation[]

  messagesByConversation: Record<string, ChatMessage[]>

  historicalToolIds: Set<string>
  runtimeToolStates: Map<string, ToolExecutionState>
  persistedTransactions: ToolExecutionState[]

  saveConversation: (id: string, title: string) => void
  deleteConversation: (id: string) => void

  setMessages: (conversationId: string, messages: ChatMessage[]) => void
  getMessages: (conversationId: string) => ChatMessage[]

  markAsHistorical: (toolCallIds: string[]) => void
  isHistorical: (toolCallId: string) => boolean
  clearHistoricalTools: () => void
  hasRuntimeState: (toolCallId: string) => boolean
  clearRuntimeState: (toolCallId: string) => void
  initializeRuntimeState: <T extends ToolExecutionState>(toolCallId: string, initialState: T) => void
  getRuntimeState: <T extends ToolExecutionState>(toolCallId: string, initialState: T) => T
  setRuntimeState: <T extends ToolExecutionState>(toolCallId: string, updater: (draft: T) => void) => void
  persistTransaction: (state: ToolExecutionState) => void
  getPersistedTransaction: (toolCallId: string) => ToolExecutionState | undefined
  getKnownTransactions: () => KnownTransaction[]
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      messagesByConversation: {},
      historicalToolIds: new Set(),
      runtimeToolStates: new Map(),
      persistedTransactions: [],

      saveConversation: (id: string, title: string) => {
        set(state => {
          const index = state.conversations.findIndex(c => c.id === id)
          const existing = index >= 0 ? state.conversations[index] : undefined

          const conversation: Conversation = {
            id,
            title,
            createdAt: existing?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }

          const updated =
            index >= 0
              ? state.conversations.map((c, i) => (i === index ? conversation : c))
              : [...state.conversations, conversation]

          return { conversations: updated }
        })
      },

      deleteConversation: (id: string) => {
        set(state => {
          const conversations = state.conversations.filter(c => c.id !== id)
          if (conversations.length === 0) {
            localStorage.removeItem(CONVERSATIONS_BACKUP_KEY)
          }
          return {
            conversations,
            persistedTransactions: state.persistedTransactions.filter(tx => tx.conversationId !== id),
            messagesByConversation: Object.fromEntries(
              Object.entries(state.messagesByConversation).filter(([key]) => key !== id)
            ),
          }
        })
      },

      setMessages: (conversationId: string, messages: ChatMessage[]) => {
        set(state => ({
          messagesByConversation: {
            ...state.messagesByConversation,
            [conversationId]: messages.slice(-MAX_MESSAGES_PER_CONVERSATION),
          },
        }))
      },

      getMessages: (conversationId: string) => {
        return get().messagesByConversation[conversationId] ?? []
      },

      markAsHistorical: (toolCallIds: string[]) => {
        set(state => {
          const newHistoricalToolIds = new Set(state.historicalToolIds)
          toolCallIds.forEach(id => newHistoricalToolIds.add(id))
          return { historicalToolIds: newHistoricalToolIds }
        })
      },

      isHistorical: (toolCallId: string) => {
        return get().historicalToolIds.has(toolCallId)
      },

      clearHistoricalTools: () => {
        set({ historicalToolIds: new Set() })
      },

      hasRuntimeState: (toolCallId: string) => {
        return get().runtimeToolStates.has(toolCallId)
      },

      clearRuntimeState: (toolCallId: string) => {
        const currentStates = get().runtimeToolStates
        if (currentStates.has(toolCallId)) {
          const newStates = new Map(currentStates)
          newStates.delete(toolCallId)
          set({ runtimeToolStates: newStates })
        }
      },

      initializeRuntimeState: <T extends ToolExecutionState>(toolCallId: string, initialState: T) => {
        const currentStates = get().runtimeToolStates
        if (!currentStates.has(toolCallId)) {
          const newStates = new Map(currentStates)
          newStates.set(toolCallId, initialState)
          set({ runtimeToolStates: newStates })
        }
      },

      getRuntimeState: <T extends ToolExecutionState>(toolCallId: string, initialState: T): T => {
        const state = get().runtimeToolStates.get(toolCallId)
        return state !== undefined ? (state as T) : initialState
      },

      setRuntimeState: <T extends ToolExecutionState>(toolCallId: string, updater: (draft: T) => void) => {
        const currentStates = get().runtimeToolStates
        const currentState = currentStates.get(toolCallId) as T | undefined

        if (currentState === undefined) {
          console.error(`[chatStore] Attempted to update uninitialized state for toolCallId: ${toolCallId}`)
          return
        }

        const updatedState = produce(currentState, updater)
        const newStates = new Map(currentStates)
        newStates.set(toolCallId, updatedState)
        set({ runtimeToolStates: newStates })
      },

      persistTransaction: (state: ToolExecutionState) => {
        const stateToPersist: ToolExecutionState = { ...state, substatus: undefined }
        set(storeState => {
          const existingIndex = storeState.persistedTransactions.findIndex(
            tx => tx.toolCallId === stateToPersist.toolCallId
          )

          let updated: ToolExecutionState[]
          if (existingIndex >= 0) {
            const existing = storeState.persistedTransactions[existingIndex]
            if (existing?.terminal) {
              return storeState
            }

            updated = [...storeState.persistedTransactions]
            updated[existingIndex] = stateToPersist
          } else {
            updated = [...storeState.persistedTransactions, stateToPersist]
          }

          const sorted = [...updated].sort((a, b) => b.timestamp - a.timestamp)
          const pruned = sorted.slice(0, 500)

          return { persistedTransactions: pruned }
        })
      },

      getPersistedTransaction: (toolCallId: string) => {
        return get().persistedTransactions.find(tx => tx.toolCallId === toolCallId)
      },

      getKnownTransactions: (): KnownTransaction[] => {
        const TOOL_NAMES = [
          'initiateSwapTool',
          'initiateSwapUsdTool',
          'sendTool',
          'vaultDepositTool',
          'vaultWithdrawTool',
          'vaultWithdrawAllTool',
        ] as const

        return get()
          .persistedTransactions.filter(
            tx => tx.terminal && !tx.error && TOOL_NAMES.includes(tx.toolName as (typeof TOOL_NAMES)[number])
          )
          .flatMap((tx): KnownTransaction[] => {
            const output = tx.toolOutput as Record<string, unknown> | undefined
            const summary = output?.summary as Record<string, unknown> | undefined

            if (tx.toolName === 'sendTool') {
              const meta = tx.meta as SendMeta
              if (!meta.txHash) return []
              const asset = summary as { symbol?: string; amount?: string } | undefined
              return [
                {
                  txHash: meta.txHash,
                  type: 'send',
                  sellSymbol: asset?.symbol,
                  sellAmount: asset?.amount,
                  network: meta.networkName,
                },
              ]
            }

            if (tx.toolName === 'initiateSwapTool' || tx.toolName === 'initiateSwapUsdTool') {
              const meta = tx.meta as SwapMeta
              if (!meta.txHash) return []
              const sell = summary?.sellAsset as { symbol?: string; amount?: string; network?: string } | undefined
              const buy = summary?.buyAsset as { symbol?: string; estimatedAmount?: string } | undefined
              return [
                {
                  txHash: meta.txHash,
                  type: 'swap',
                  sellSymbol: sell?.symbol,
                  sellAmount: sell?.amount,
                  buySymbol: buy?.symbol,
                  buyAmount: buy?.estimatedAmount,
                  network: meta.networkName ?? sell?.network,
                },
              ]
            }

            if (tx.toolName === 'vaultDepositTool' || tx.toolName === 'vaultWithdrawTool') {
              const meta = tx.meta as VaultDepositMeta
              if (!meta.txHash) return []
              const asset = summary?.asset as { symbol?: string; amount?: string } | undefined
              return [
                {
                  txHash: meta.txHash,
                  type: tx.toolName === 'vaultDepositTool' ? 'deposit' : 'withdraw',
                  sellSymbol: asset?.symbol,
                  sellAmount: asset?.amount,
                  network: meta.networkName,
                },
              ]
            }

            if (tx.toolName === 'vaultWithdrawAllTool') {
              const meta = tx.meta as VaultWithdrawAllMeta
              return meta.chainResults
                .filter((cr: ChainResult) => cr.txHash && !cr.error)
                .map((cr: ChainResult) => ({ txHash: cr.txHash!, type: 'withdraw' as const, network: cr.network }))
            }

            return []
          })
      },
    }),
    {
      name: 'sola-ai-chat-store',
      version: STORE_VERSION,
      storage: createJSONStorage(() => idbStorage),
      partialize: state => ({
        conversations: state.conversations,
        persistedTransactions: state.persistedTransactions,
        messagesByConversation: state.messagesByConversation,
      }),
      migrate: (persisted, version) => {
        const state = persisted as Record<string, unknown>
        if (version < 2) {
          state.messagesByConversation = {}
        }
        if (version < 3) {
          state.persistedTransactions = []
        }
        return state as unknown as ChatState
      },
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.error('[chatStore] Hydration failed:', error)
            return
          }
          if (state && state.conversations.length > 0) {
            hydrationVerified = true
            return
          }
          // Hydrated empty — try restoring from localStorage backup
          const backup = localStorage.getItem(CONVERSATIONS_BACKUP_KEY)
          if (backup && state) {
            try {
              const conversations = JSON.parse(backup)
              if (Array.isArray(conversations) && conversations.length > 0) {
                console.warn(
                  '[chatStore] IDB empty but backup found — restoring',
                  conversations.length,
                  'conversations'
                )
                state.conversations = conversations
              }
            } catch {
              console.error('[chatStore] Failed to parse conversations backup')
            }
          }
          hydrationVerified = true
        }
      },
    }
  )
)
