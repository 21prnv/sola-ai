import { createResumableStreamContext } from 'resumable-stream/generic'
import type { Publisher, Subscriber } from 'resumable-stream/generic'

function createInMemoryPublisher(): Publisher {
  const store = new Map<string, string>()
  const channels = new Map<string, Set<(message: string) => void>>()

  return {
    connect: async () => {},
    publish: async (channel: string, message: string) => {
      const listeners = channels.get(channel)
      if (listeners) {
        for (const listener of listeners) listener(message)
      }
      return listeners?.size ?? 0
    },
    set: async (key: string, value: string) => {
      store.set(key, value)
      return 'OK' as const
    },
    get: async (key: string) => store.get(key) ?? null,
    incr: async (key: string) => {
      const val = Number(store.get(key) ?? 0) + 1
      store.set(key, String(val))
      return val
    },
  }
}

const sharedChannels = new Map<string, Set<(message: string) => void>>()

function createInMemorySubscriber(): Subscriber {
  return {
    connect: async () => {},
    subscribe: async (channel: string, callback: (message: string) => void) => {
      if (!sharedChannels.has(channel)) sharedChannels.set(channel, new Set())
      sharedChannels.get(channel)!.add(callback)
    },
    unsubscribe: async (channel: string) => {
      sharedChannels.delete(channel)
    },
  }
}

const publisher = createInMemoryPublisher()
const subscriber = createInMemorySubscriber()

// Patch: wire publisher.publish to subscriber channels
const originalPublish = publisher.publish
publisher.publish = async (channel: string, message: string) => {
  const listeners = sharedChannels.get(channel)
  if (listeners) {
    for (const listener of listeners) listener(message)
  }
  return listeners?.size ?? 0
}

let streamContext: ReturnType<typeof createResumableStreamContext> | undefined

function getStreamContext() {
  if (!streamContext) {
    streamContext = createResumableStreamContext({
      waitUntil: null,
      publisher,
      subscriber,
    })
  }
  return streamContext
}

const conversationStreamMap = new Map<string, string>()

export function registerStream(conversationId: string, streamId: string) {
  conversationStreamMap.set(conversationId, streamId)
}

export function clearStream(conversationId: string) {
  conversationStreamMap.delete(conversationId)
}

export function getStreamIdForConversation(conversationId: string): string | undefined {
  return conversationStreamMap.get(conversationId)
}

export async function createResumableStream(
  streamId: string,
  stream: ReadableStream
): Promise<ReadableStream> {
  try {
    const resumable = await getStreamContext().createNewResumableStream(
      streamId,
      () => stream as ReadableStream<string>
    )
    return resumable ?? stream
  } catch {
    return stream
  }
}

export async function getResumableStream(streamId: string): Promise<ReadableStream | null> {
  try {
    const stream = await getStreamContext().resumableStream(streamId, () => {
      return new ReadableStream<string>({
        start(controller) {
          controller.close()
        },
      })
    })
    return stream ?? null
  } catch {
    return null
  }
}
