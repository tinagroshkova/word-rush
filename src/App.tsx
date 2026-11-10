import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  ActionResult,
  EmoteEvent,
  PowerUpResult,
  SubmitResult,
} from '../shared/events'
import { RARE_LETTERS } from '../shared/game'
import { translate, type MessageKey, type MessageVars } from '../shared/i18n'
import type { LanguageCode } from '../shared/languages'
import type { PowerUpType, RoomSettings, RoomState } from '../shared/types'
import styles from './App.module.scss'
import { AppHeader } from './components/AppHeader'
import { Home } from './components/Home'
import { Room } from './components/Room'
import { Rules } from './components/Rules'
import type { ConnectionStatus } from './connection'
import { playSound } from './sound'
import { socket } from './socket'
import {
  getPlayerId,
  getStats,
  getStoredLanguage,
  getStoredName,
  getStoredRoomCode,
  getStoredSound,
  getStoredTheme,
  storeLanguage,
  storeName,
  storeRoomCode,
  storeSound,
  storeStats,
  storeTheme,
  type AchievementId,
  type PlayerStats,
  type Theme,
} from './storage'
import { applyTheme } from './theme'

interface MatchWord {
  word: string
  points: number
}

interface MatchTracker {
  code: string
  words: MatchWord[]
  bestStreak: number
}

interface EmoteBurst {
  id: number
  name: string
  emoji: string
}

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
  const [stats, setStats] = useState<PlayerStats>(getStats)
  const [soundOn, setSoundOn] = useState(getStoredSound)
  const [emoteBursts, setEmoteBursts] = useState<EmoteBurst[]>([])
  const [earnedAchievements, setEarnedAchievements] = useState<AchievementId[]>([])

  const activeCodeRef = useRef<string | null>(getStoredRoomCode())
  const nameRef = useRef(name)
  nameRef.current = name
  const languageRef = useRef(language)
  languageRef.current = language
  const soundOnRef = useRef(soundOn)
  soundOnRef.current = soundOn
  const matchRef = useRef<MatchTracker | null>(null)
  const recordedRef = useRef<string | null>(null)
  const emoteIdRef = useRef(0)

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

  const handleSoundToggle = useCallback(() => {
    setSoundOn((current) => {
      const next = !current
      storeSound(next)
      return next
    })
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
    async (bots = 0, daily = false) => {
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
          daily,
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
        const result = await socket
          .timeout(ACK_TIMEOUT_MS)
          .emitWithAck('word:submit', { word })
        playSound(result.ok ? 'accepted' : 'rejected', soundOnRef.current)
        return result
      } catch {
        return { ok: false, error: t('error.unreachable') }
      }
    },
    [t],
  )

  const updateSettings = useCallback(
    async (settings: Partial<RoomSettings>): Promise<boolean> => {
      setBusy(true)
      try {
        const result = await socket
          .timeout(ACK_TIMEOUT_MS)
          .emitWithAck('room:updateSettings', { settings })
        if (result.ok) {
          notify(t('lobby.settingsSaved'))
          return true
        }
        notify(result.error ?? t('error.invalidSettings'))
        return false
      } catch {
        notify(unreachable().error ?? t('error.unreachable'))
        return false
      } finally {
        setBusy(false)
      }
    },
    [notify, t, unreachable],
  )

  const usePowerUpAction = useCallback(
    async (type: PowerUpType): Promise<PowerUpResult> => {
      try {
        return await socket.timeout(ACK_TIMEOUT_MS).emitWithAck('powerup:use', { type })
      } catch {
        return { ok: false, error: t('error.unreachable') }
      }
    },
    [t],
  )

  const sendEmote = useCallback((emoji: string) => {
    socket.emit('emote:send', { emoji })
  }, [])

  const trackWord = useCallback((word: string, points: number, streak: number) => {
    const current = matchRef.current
    if (!current) {
      return
    }
    current.words.push({ word, points })
    current.bestStreak = Math.max(current.bestStreak, streak)
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

      if (state.phase === 'lobby') {
        matchRef.current = null
      } else if (
        state.phase === 'playing' &&
        (!matchRef.current || matchRef.current.code !== state.code)
      ) {
        matchRef.current = { code: state.code, words: [], bestStreak: 0 }
      }
    }

    const handleClosed = () => {
      activeCodeRef.current = null
      storeRoomCode(null)
      setRoom(null)
      notify(t('error.roomClosed'))
    }

    const handleNotice = (message: string) => notify(message)

    const handleEmote = (event: EmoteEvent) => {
      playSound('emote', soundOnRef.current)
      emoteIdRef.current += 1
      const id = emoteIdRef.current
      setEmoteBursts((current) => [
        ...current,
        { id, name: event.playerName, emoji: event.emoji },
      ])
      window.setTimeout(() => {
        setEmoteBursts((current) => current.filter((burst) => burst.id !== id))
      }, 3200)
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('connect_error', handleConnectError)
    socket.on('state:update', handleState)
    socket.on('room:closed', handleClosed)
    socket.on('notice', handleNotice)
    socket.on('emote', handleEmote)

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
      socket.off('emote', handleEmote)
    }
  }, [notify, playerId, t])

  useEffect(() => {
    if (!room) {
      return
    }

    if (room.phase === 'lobby') {
      recordedRef.current = null
      setEarnedAchievements((current) => (current.length === 0 ? current : []))
      return
    }

    if (room.phase !== 'finished' || recordedRef.current === room.code) {
      return
    }

    recordedRef.current = room.code
    const me = room.players.find((player) => player.id === playerId)
    if (!me || me.spectator) {
      return
    }

    const tracker = matchRef.current
    const words = tracker?.words ?? []
    const bestWord = words.reduce(
      (best, entry) => (entry.word.length > best.length ? entry.word : best),
      '',
    )
    const bestStreak = Math.max(me.bestStreak, tracker?.bestStreak ?? 0)
    const topScore = room.players.reduce(
      (max, player) => Math.max(max, player.score),
      0,
    )
    const won = me.score > 0 && me.score === topScore
    const earned: AchievementId[] = []
    if (won) {
      earned.push('firstWin')
    }
    if (bestStreak >= 3) {
      earned.push('streak3')
    }
    if (bestStreak >= 5) {
      earned.push('streak5')
    }
    if (words.some((entry) => [...entry.word].some((letter) => RARE_LETTERS.has(letter)))) {
      earned.push('rare')
    }
    if (bestWord.length >= 8) {
      earned.push('long')
    }
    if (room.daily) {
      earned.push('daily')
    }

    setEarnedAchievements(earned)
    setStats((current) => {
      const achievements = new Set<AchievementId>(current.achievements)
      earned.forEach((id) => achievements.add(id))
      const next: PlayerStats = {
        games: current.games + 1,
        wins: current.wins + (won ? 1 : 0),
        bestScore: Math.max(current.bestScore, me.score),
        bestWord: bestWord.length > current.bestWord.length ? bestWord : current.bestWord,
        bestStreak: Math.max(current.bestStreak, bestStreak),
        achievements: [...achievements],
      }
      storeStats(next)
      return next
    })
    if (won) {
      playSound('win', soundOnRef.current)
    }
  }, [room, playerId])

  return (
    <div className={styles.app}>
      <AppHeader
        language={language}
        theme={theme}
        soundOn={soundOn}
        onLanguageChange={handleLanguageChange}
        onToggleTheme={handleThemeToggle}
        onToggleSound={handleSoundToggle}
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
          stats={stats}
          earnedAchievements={earnedAchievements}
          onLeave={() => void leaveRoom()}
          onStart={() => void runHostAction('game:start')}
          onNext={() => void runHostAction('game:next')}
          onRestart={() => void runHostAction('game:restart')}
          onAddBot={() => void addBots(1)}
          onRemoveBot={(botId) => void removeBot(botId)}
          onShowRules={() => setShowRules(true)}
          onSubmit={submitWord}
          onUpdateSettings={updateSettings}
          onUsePowerUp={usePowerUpAction}
          onEmote={sendEmote}
          onWordAccepted={trackWord}
        />
      ) : (
        <Home
          name={name}
          language={language}
          status={status}
          busy={busy}
          error={error}
          stats={stats}
          onNameChange={handleNameChange}
          onCreate={() => void createRoom(0)}
          onCreateBots={() => void createRoom(3)}
          onCreateDaily={() => void createRoom(3, true)}
          onJoin={(code) => void joinRoom(code)}
          onShowRules={() => setShowRules(true)}
        />
      )}

      {emoteBursts.length > 0 && (
        <div className={styles.emotes} aria-live="polite">
          {emoteBursts.map((burst) => (
            <span key={burst.id} className={styles.emote}>
              <span className={styles.emoteEmoji}>{burst.emoji}</span>
              <span className={styles.emoteName}>{burst.name}</span>
            </span>
          ))}
        </div>
      )}

      {notice && <div className={styles.toast}>{notice}</div>}
    </div>
  )
}
