import type { Server as HttpServer } from 'node:http'
import { Server, type Socket } from 'socket.io'
import { clientIp } from './auth-guard.js'
import { setChatEvents, typingTarget } from './chat-messages.js'
import { originForbidden } from './edge-request.js'
import { applySessionGate, loadLiveSession } from './pin-session.js'
import { assertBrowseViewer } from './public-profile.js'

/**
 * Realtime Chat channel (AD-15, Stories 5.1, 5.2): Socket.IO on `/v1/realtime`. The handshake goes through the same
 * gates as HTTP: Origin (AD-17 CSRF), session and PIN lock, then the member viewer gate. A socket joins only its own
 * room `account:<id>`. Events carry ids only: `message.delivered { conversation_id, message_id, sender_id }` and
 * `conversation.typing { conversation_id, account_id }`, and (story chat-polish) `conversation.read { conversation_id,
 * account_id, message_id }` to the reader and, unless a Block holds, the other member. There is no pending, held or
 * blocked event. No BillingPort.
 */

export const REALTIME_PATH = '/v1/realtime'
export const TYPING_INTERVAL_MS = 1000

type HandshakeRequest = {
  headers: Record<string, string | string[] | undefined>
  socket?: { remoteAddress?: string | null }
  method?: string
  url?: string
}

function cookieOf(request: HandshakeRequest): string | undefined {
  const value = request.headers['cookie']
  return Array.isArray(value) ? value.join('; ') : value
}

function refusal(code: string): Error & { data: { code: string } } {
  const error = new Error(code) as Error & { data: { code: string } }
  error.data = { code }
  return error
}

type SocketData = { accountId: string; lastTyping: Map<string, number> }

let current: Server | undefined

/** Attaches the Socket.IO server to the api HTTP server and registers the Chat event fan-out. */
export function attachRealtime(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    path: REALTIME_PATH,
    // `/v1/realtime?EIO=…`, never `/v1/realtime/?EIO=…`: the web's Next rewrite answers a trailing slash with a 308.
    addTrailingSlash: false,
    serveClient: true,
    // No `cors` option: same-origin through the web rewrite only, no cross-origin headers.
    allowRequest: (request, callback) => {
      // A cookie WS from another site is refused before any session lookup (AD-17).
      const forbidden = originForbidden({ headers: request.headers, method: 'POST', url: REALTIME_PATH })
      callback(forbidden ? 'FORBIDDEN' : null, !forbidden)
    },
  })

  io.use((socket, next) => {
    const request = socket.request as unknown as HandshakeRequest
    const cookie = cookieOf(request)
    void (async () => {
      const gate = await applySessionGate('GET', REALTIME_PATH, cookie, clientIp(request))
      if (gate.stop) {
        return next(refusal('status' in gate ? 'FORBIDDEN' : 'PIN_REQUIRED'))
      }
      const session = await loadLiveSession(cookie)
      if (!session) {
        return next(refusal('UNAUTHENTICATED'))
      }
      const viewer = await assertBrowseViewer(session)
      if (!viewer.ok) {
        return next(refusal('FORBIDDEN'))
      }
      const data: SocketData = { accountId: viewer.account.id, lastTyping: new Map() }
      socket.data = data
      return next()
    })().catch(() => next(refusal('UNHANDLED')))
  })

  io.on('connection', (socket: Socket) => {
    const data = socket.data as SocketData
    void socket.join(`account:${data.accountId}`)
    socket.on('conversation.typing', (payload: unknown) => {
      const conversationId =
        typeof payload === 'object' && payload !== null ? (payload as { conversation_id?: unknown }).conversation_id : undefined
      if (typeof conversationId !== 'string') {
        return
      }
      const now = Date.now()
      const last = data.lastTyping.get(conversationId) ?? 0
      if (now - last < TYPING_INTERVAL_MS) {
        return
      }
      data.lastTyping.set(conversationId, now)
      void (async () => {
        // The session may have ended since the handshake: check it again before relaying anything.
        const session = await loadLiveSession(cookieOf(socket.request as unknown as HandshakeRequest))
        if (!session || session.account_id !== data.accountId) {
          socket.disconnect(true)
          return
        }
        const otherId = await typingTarget(session, conversationId)
        if (otherId) {
          io.to(`account:${otherId}`).emit('conversation.typing', { conversation_id: conversationId, account_id: data.accountId })
        }
      })().catch(() => undefined)
    })
  })

  setChatEvents({
    messageDelivered({ conversationId, messageId, senderId, recipients }) {
      const rooms = [...new Set(recipients)].map((id) => `account:${id}`)
      io.to(rooms).emit('message.delivered', { conversation_id: conversationId, message_id: messageId, sender_id: senderId })
    },
    conversationRead({ conversationId, readerId, messageId, recipients }) {
      const rooms = [...new Set(recipients)].map((id) => `account:${id}`)
      io.to(rooms).emit('conversation.read', { conversation_id: conversationId, account_id: readerId, message_id: messageId })
    },
  })
  current = io
  return io
}

/** Closes the realtime server (app shutdown and tests). */
export async function closeRealtime(): Promise<void> {
  const io = current
  current = undefined
  setChatEvents(undefined)
  if (io) {
    io.disconnectSockets(true)
    // The HTTP server belongs to Nest; only detach Socket.IO's own engine.
    io.engine.close()
  }
}
