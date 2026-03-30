import type { Context } from 'hono'

import { getResumableStream, getStreamIdForConversation } from '../lib/streamRegistry'

export async function handleChatResumeRequest(c: Context) {
  const conversationId = c.req.param('conversationId')

  if (!conversationId) {
    return c.json({ error: 'Missing conversationId' }, 400)
  }

  const streamId = getStreamIdForConversation(conversationId)

  if (!streamId) {
    return c.json({ error: 'No active stream for this conversation' }, 404)
  }

  const stream = await getResumableStream(streamId)

  if (!stream) {
    return c.json({ error: 'Stream not found or already completed' }, 404)
  }

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'x-stream-id': streamId,
      'x-conversation-id': conversationId,
    },
  })
}
