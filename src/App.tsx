import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ActionResult, SubmitResult } from '../shared/events'
import { translate, type MessageKey, type MessageVars } from '../shared/i18n'
import type { LanguageCode } from '../shared/languages'
import type { RoomState } from '../shared/types'
import styles from './App.module.scss'
import { AppHeader } from './components/AppHeader'
import { Home } from './components/Home'
import { Room } from './components/Room'
import { Rules } from './components/Rules'
import type { ConnectionStatus } from './connection'
import { socket } from './socket'
import {
  getPlayerId,
  getStoredLanguage,
  getStoredName,
  getStoredRoomCode,
  getStoredTheme,
  storeLanguage,
  storeName,
  storeRoomCode,
  storeTheme,
  type Theme,
} from './storage'
import { applyTheme } from './theme'

const ACK_TIMEOUT_MS = 6000

export const App = () => {
  const playerId = useMemo(getPlayerId, [])
  const [name, setName] = useState(getStoredName)
  const [language, setLanguage] = useState<LanguageCode>(getStoredLanguage)
  const [theme, setTheme] = useState<Theme>(getStoredTheme)
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
  const languageRef = useRef(language)
  languageRef.current = language

  const t = useCallback(
    (key: MessageKey, vars?: MessageVars) => translate(languageRef.current, key, vars),
    [],
  )

  const unreachable = useCallback(
    (): ActionResult => ({ ok: false, error: t('error.unreachable') }),
    [t],
  )

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

  const handleLanguageChange = useCallback((value: LanguageCode) => {
    setLanguage(value)
    languageRef.current = value
    storeLanguage(value)
  }, [])

  const handleThemeToggle = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }, [])

  useEffect(() => {
    applyTheme(theme)
    storeTheme(theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const joinWithCode = useCallback(
    async (code: string): Promise<ActionResult> => {
      try {
        const result = await socket
          .timeout(ACK_TIMEOUT_MS)
          .emitWithAck('room:join', {
            playerId,
            name: nameRef.current.trim() || 'Player',
            code,
            language: languageRef.current,
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
    [playerId, unreachable],
  )

  const createRoom = useCallback(
    async (bots = 0) => {
      const trimmed = nameRef.current.trim()
      if (!trimmed) {
        setError(t('error.chooseNameCreate'))
        return
      }

      setBusy(true)
      setError(null)

      try {
        const result = await socket.timeout(ACK_TIMEOUT_MS).emitWithAck('room:create', {
          playerId,
          name: trimmed,
          language: languageRef.current,
        })

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
          setError(result.error ?? t('error.createRoom'))
        }
      } catch {
        setError(unreachable().error ?? t('error.unreachable'))
      } finally {
        setBusy(false)
      }
    },
    [playerId, t, unreachable],
  )

  const joinRoom = useCallback(
    async (rawCode: string) => {
      const trimmed = nameRef.current.trim()
      if (!trimmed) {
        setError(t('error.chooseNameJoin'))
        return
      }

      const code = rawCode.trim().toUpperCase()
      if (code.length === 0) {
        setError(t('error.enterCode'))
        return
      }

      setBusy(true)
      setError(null)

      const result = await joinWithCode(code)
      if (!result.ok) {
        setError(result.error ?? t('error.joinRoom'))
      }

      setBusy(false)
    },
    [joinWithCode, t],
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
          notify(result.error ?? t('error.actionUnavailable'))
        }
      } catch {
        notify(unreachable().error ?? t('error.unreachable'))
      } finally {
        setBusy(false)
      }
    },
    [notify, t, unreachable],
  )

  const addBots = useCallback(
    async (count: number) => {
      setBusy(true)
      try {
        const result = await socket
          .timeout(ACK_TIMEOUT_MS)
          .emitWithAck('room:addBots', { count })
        if (!result.ok) {
          notify(result.error ?? t('error.addBot'))
        }
      } catch {
        notify(unreachable().error ?? t('error.unreachable'))
      } finally {
        setBusy(false)
      }
    },
    [notify, t, unreachable],
  )

  const removeBot = useCallback(
    async (botId: string) => {
      setBusy(true)
      try {
        const result = await socket
          .timeout(ACK_TIMEOUT_MS)
          .emitWithAck('room:removeBot', { botId })
        if (!result.ok) {
          notify(result.error ?? t('error.removeBot'))
        }
      } catch {
        notify(unreachable().error ?? t('error.unreachable'))
      } finally {
        setBusy(false)
      }
    },
    [notify, t, unreachable],
  )

  const submitWord = useCallback(
    async (word: string): Promise<SubmitResult> => {
      try {
        return await socket.timeout(ACK_TIMEOUT_MS).emitWithAck('word:submit', { word })
      } catch {
        return { ok: false, error: t('error.unreachable') }
      }
    },
    [t],
  )

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
              language: languageRef.current,
            })

          if (!result.ok) {
            activeCodeRef.current = null
            storeRoomCode(null)
            setRoom(null)
            notify(result.error ?? t('error.roomGone'))
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
      notify(t('error.roomClosed'))
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
  }, [notify, playerId, t])

  return (
    <div className={styles.app}>
      <AppHeader
        language={language}
        theme={theme}
        onLanguageChange={handleLanguageChange}
        onToggleTheme={handleThemeToggle}
      />

      {showRules ? (
        <Rules language={language} onClose={() => setShowRules(false)} />
      ) : room ? (
        <Room
          room={room}
          language={language}
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
          language={language}
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
