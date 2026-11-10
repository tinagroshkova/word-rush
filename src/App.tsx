import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ActionResult, SubmitResult } from '../shared/events'
import type { RoomState } from '../shared/types'
import styles from './App.module.scss'
import { Home } from './components/Home'
import { Room } from './components/Room'
import { Rules } from './components/Rules'
import type { ConnectionStatus } from './connection'
import { socket } from './socket'
import {
  getPlayerId,
  getStoredName,
  getStoredRoomCode,
  storeName,
  storeRoomCode,
} from './storage'

const ACK_TIMEOUT_MS = 6000

const unreachable = (): ActionResult => ({
  ok: false,
  error: 'Could not reach the server. Please try again.',
})

export const App = () => {
  const playerId = useMemo(getPlayerId, [])
  const [name, setName] = useState(getStoredName)
  const [room, setRoom] = useState<RoomState | null>(null)
  const [status, setStatus] = useState<ConnectionStatus>(
    socket.connected ? 'connected' : 'connecting',
  )
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [serverOffset, setServerOffset] = useState(0)
  const [showRules, setShowRules] = useState(false)

  const activeCodeRef = useRef<string | null>(getStoredRoomCode())
  const nameRef = useRef(name)
  nameRef.current = name

  const notify = useCallback((message: string) => {
    setNotice(message)
    window.setTimeout(() => {
      setNotice((current) => (current === message ? null : current))
    }, 4200)
  }, [])

  const handleNameChange = useCallback((value: string) => {
    setName(value)
    nameRef.current = value
    storeName(value)
  }, [])

  const joinWithCode = useCallback(
    async (code: string): Promise<ActionResult> => {
      try {
        const result = await socket
          .timeout(ACK_TIMEOUT_MS)
          .emitWithAck('room:join', {
            playerId,
            name: nameRef.current.trim() || 'Player',
            code,
          })

        if (result.ok && result.code) {
          activeCodeRef.current = result.code
          storeRoomCode(result.code)
        }

        return result
      } catch {
        return unreachable()
      }
    },
    [playerId],
  )

  const createRoom = useCallback(
    async (bots = 0) => {
      const trimmed = nameRef.current.trim()
      if (!trimmed) {
        setError('Choose a name before creating a room')
        return
      }

      setBusy(true)
      setError(null)

      try {
        const result = await socket
          .timeout(ACK_TIMEOUT_MS)
          .emitWithAck('room:create', { playerId, name: trimmed })

        if (result.ok && result.code) {
          activeCodeRef.current = result.code
          storeRoomCode(result.code)

          if (bots > 0) {
            try {
              await socket
                .timeout(ACK_TIMEOUT_MS)
                .emitWithAck('room:addBots', { count: bots })
            } catch {
              // the room still exists; the host can add bots from the lobby
            }
          }
        } else {
          setError(result.error ?? 'Could not create a room')
        }
      } catch {
        setError(unreachable().error ?? 'Could not reach the server')
      } finally {
        setBusy(false)
      }
    },
    [playerId],
  )

  const joinRoom = useCallback(
    async (rawCode: string) => {
      const trimmed = nameRef.current.trim()
      if (!trimmed) {
        setError('Choose a name before joining a room')
        return
      }

      const code = rawCode.trim().toUpperCase()
      if (code.length === 0) {
        setError('Enter a room code')
        return
      }

      setBusy(true)
      setError(null)

      const result = await joinWithCode(code)
      if (!result.ok) {
        setError(result.error ?? 'Could not join that room')
      }

      setBusy(false)
    },
    [joinWithCode],
  )

  const leaveRoom = useCallback(async () => {
    try {
      await socket.timeout(ACK_TIMEOUT_MS).emitWithAck('room:leave')
    } catch {
      // leaving locally is still the right move if the server is unreachable
    }

    activeCodeRef.current = null
    storeRoomCode(null)
    setRoom(null)
    setError(null)
  }, [])

  const runHostAction = useCallback(
    async (event: 'game:start' | 'game:next' | 'game:restart') => {
      setBusy(true)
      try {
        const result = await socket.timeout(ACK_TIMEOUT_MS).emitWithAck(event)
        if (!result.ok) {
          notify(result.error ?? 'That action is not available right now')
        }
      } catch {
        notify(unreachable().error ?? 'Could not reach the server')
      } finally {
        setBusy(false)
      }
    },
    [notify],
  )

  const addBots = useCallback(
    async (count: number) => {
      setBusy(true)
      try {
        const result = await socket
          .timeout(ACK_TIMEOUT_MS)
          .emitWithAck('room:addBots', { count })
        if (!result.ok) {
          notify(result.error ?? 'Could not add a bot')
        }
      } catch {
        notify(unreachable().error ?? 'Could not reach the server')
      } finally {
        setBusy(false)
      }
    },
    [notify],
  )

  const removeBot = useCallback(
    async (botId: string) => {
      setBusy(true)
      try {
        const result = await socket
          .timeout(ACK_TIMEOUT_MS)
          .emitWithAck('room:removeBot', { botId })
        if (!result.ok) {
          notify(result.error ?? 'Could not remove that bot')
        }
      } catch {
        notify(unreachable().error ?? 'Could not reach the server')
      } finally {
        setBusy(false)
      }
    },
    [notify],
  )

  const submitWord = useCallback(async (word: string): Promise<SubmitResult> => {
    try {
      return await socket.timeout(ACK_TIMEOUT_MS).emitWithAck('word:submit', { word })
    } catch {
      return { ok: false, error: unreachable().error }
    }
  }, [])

  useEffect(() => {
    const handleConnect = () => {
      setStatus('connected')

      const code = activeCodeRef.current
      if (!code) {
        return
      }

      void (async () => {
        try {
          const result = await socket
            .timeout(ACK_TIMEOUT_MS)
            .emitWithAck('room:join', {
              playerId,
              name: nameRef.current.trim() || 'Player',
              code,
            })

          if (!result.ok) {
            activeCodeRef.current = null
            storeRoomCode(null)
            setRoom(null)
            notify(result.error ?? 'That room is no longer available')
          }
        } catch {
          // the next reconnect attempt will try again
        }
      })()
    }

    const handleDisconnect = () => setStatus('disconnected')
    const handleConnectError = () => setStatus('disconnected')

    const handleState = (state: RoomState) => {
      setRoom(state)
      setServerOffset(state.serverTime - Date.now())
      activeCodeRef.current = state.code
      storeRoomCode(state.code)
    }

    const handleClosed = () => {
      activeCodeRef.current = null
      storeRoomCode(null)
      setRoom(null)
      notify('The room was closed')
    }

    const handleNotice = (message: string) => notify(message)

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('connect_error', handleConnectError)
    socket.on('state:update', handleState)
    socket.on('room:closed', handleClosed)
    socket.on('notice', handleNotice)

    if (socket.connected) {
      handleConnect()
    }

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('connect_error', handleConnectError)
      socket.off('state:update', handleState)
      socket.off('room:closed', handleClosed)
      socket.off('notice', handleNotice)
    }
  }, [notify, playerId])

  return (
    <div className={styles.app}>
      {showRules ? (
        <Rules onClose={() => setShowRules(false)} />
      ) : room ? (
        <Room
          room={room}
          playerId={playerId}
          serverOffset={serverOffset}
          status={status}
          busy={busy}
          onLeave={() => void leaveRoom()}
          onStart={() => void runHostAction('game:start')}
          onNext={() => void runHostAction('game:next')}
          onRestart={() => void runHostAction('game:restart')}
          onAddBot={() => void addBots(1)}
          onRemoveBot={(botId) => void removeBot(botId)}
          onShowRules={() => setShowRules(true)}
          onSubmit={submitWord}
        />
      ) : (
        <Home
          name={name}
          status={status}
          busy={busy}
          error={error}
          onNameChange={handleNameChange}
          onCreate={() => void createRoom(0)}
          onCreateBots={() => void createRoom(3)}
          onJoin={(code) => void joinRoom(code)}
          onShowRules={() => setShowRules(true)}
        />
      )}

      {notice && <div className={styles.toast}>{notice}</div>}
    </div>
  )
}
