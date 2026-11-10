import { readFile } from 'node:fs/promises'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Server } from 'socket.io'
import type {
  ActionResult,
  ClientToServerEvents,
  ServerToClientEvents,
  SubmitResult,
} from '../shared/events'
import { isDictionaryWord } from './dictionary'
import { RoomStore } from './roomStore'

const PORT = Number(process.env.PORT ?? 3001)
const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIST_DIR = join(ROOT_DIR, 'dist')

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
}

const send = (res: ServerResponse, status: number, body: string, type: string): void => {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-cache' })
  res.end(body)
}

const serveClient = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
  const requestUrl = req.url ?? '/'
  const pathname = decodeURIComponent(new URL(requestUrl, 'http://localhost').pathname)
  const relative = pathname.replace(/^\/+/, '')
  const filePath = join(DIST_DIR, relative === '' ? 'index.html' : relative)

  try {
    const body = await readFile(filePath)
    send(res, 200, body.toString(), MIME_TYPES[extname(filePath)] ?? 'application/octet-stream')
    return
  } catch {
    // fall through to SPA fallback
  }

  if (relative.startsWith('assets/')) {
    send(res, 404, 'Not found', 'text/plain; charset=utf-8')
    return
  }

  try {
    const html = await readFile(join(DIST_DIR, 'index.html'))
    send(res, 200, html.toString(), MIME_TYPES['.html'] ?? 'text/html')
  } catch {
    send(
      res,
      200,
      'Word Rush server is running. Start the client with "npm run dev" or build it with "npm run build".',
      'text/plain; charset=utf-8',
    )
  }
}

const httpServer = createServer((req, res) => {
  void serveClient(req, res)
})

const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  { playerId?: string; code?: string }
>(httpServer, {
  cors: {
    origin: true,
    credentials: true,
  },
})

const store = new RoomStore((code, state) => {
  io.to(code).emit('state:update', state)
}, isDictionaryWord)

const notInRoom: ActionResult = { ok: false, error: 'You are not in a room' }

io.on('connection', (socket) => {
  socket.on('room:create', async ({ playerId, name }, ack) => {
    if (socket.data.code) {
      await socket.leave(socket.data.code)
    }

    const result = store.createRoom(playerId, name, socket.id)

    if (result.ok && result.code) {
      socket.data.playerId = playerId
      socket.data.code = result.code
      await socket.join(result.code)
      store.sync(result.code)
    }

    ack(result)
  })

  socket.on('room:join', async ({ playerId, name, code }, ack) => {
    if (socket.data.code && socket.data.code !== code.trim().toUpperCase()) {
      await socket.leave(socket.data.code)
    }

    const result = store.joinRoom(playerId, name, code, socket.id)

    if (result.ok && result.code) {
      socket.data.playerId = playerId
      socket.data.code = result.code
      await socket.join(result.code)
      store.sync(result.code)
    }

    ack(result)
  })

  socket.on('room:leave', (ack) => {
    const { playerId, code } = socket.data

    if (playerId) {
      store.leaveRoom(playerId)
    }

    if (code) {
      void socket.leave(code)
    }

    socket.data.code = undefined
    ack({ ok: true })
  })

  socket.on('game:start', (ack) => {
    ack(socket.data.playerId ? store.startGame(socket.data.playerId) : notInRoom)
  })

  socket.on('game:next', (ack) => {
    ack(socket.data.playerId ? store.nextRound(socket.data.playerId) : notInRoom)
  })

  socket.on('game:restart', (ack) => {
    ack(socket.data.playerId ? store.restart(socket.data.playerId) : notInRoom)
  })

  socket.on('word:submit', ({ word }, ack) => {
    if (!socket.data.playerId) {
      ack({ ...notInRoom } satisfies SubmitResult)
      return
    }

    ack(store.submit(socket.data.playerId, word))
  })

  socket.on('disconnect', () => {
    if (socket.data.playerId) {
      store.handleDisconnect(socket.data.playerId, socket.id)
    }
  })
})

httpServer.listen(PORT, () => {
  console.log(`Word Rush server listening on http://localhost:${PORT}`)
})
