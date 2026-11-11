import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_MAX_ROUNDS,
  MAX_ROUNDS,
  MIN_ROUND_DURATION_MS,
  MIN_WORD_LENGTH_SETTING,
  ROUND_DURATION_MS,
} from '../shared/game'
import type { LanguageCode } from '../shared/languages'
import type { RoomState } from '../shared/types'
import { RoomStore } from './roomStore'

const isWord = (_language: LanguageCode, word: string): boolean => word.length >= 4

const wordFor = (target: string): string =>
  `${target}${'z'.repeat(Math.max(0, 4 - target.length))}`

const setup = () => {
  let latest: RoomState | null = null
  const pickBotWord = (
    _language: LanguageCode,
    target: string,
    usedWords: ReadonlySet<string>,
  ): string => `${target}${'z'.repeat(2 + usedWords.size)}`
  const store = new RoomStore(
    (_code, state) => {
      latest = state
    },
    isWord,
    pickBotWord,
  )

  const state = (): RoomState => {
    if (!latest) {
      throw new Error('No state has been broadcast yet')
    }
    return latest
  }

  return { store, state }
}

const createLobby = () => {
  const context = setup()
  const created = context.store.createRoom('p1', 'Alice', 's1')
  const code = created.code

  if (!code) {
    throw new Error('Room was not created')
  }

  context.store.joinRoom('p2', 'Bob', code, 's2')
  context.store.sync(code)

  return { ...context, code }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('RoomStore', () => {
  it('creates a lobby and starts a round', () => {
    const { store, state, code } = createLobby()

    expect(state().code).toBe(code)
    expect(state().phase).toBe('lobby')
    expect(state().language).toBe('en')
    expect(state().players).toHaveLength(2)

    expect(store.startGame('p1').ok).toBe(true)
    expect(state().phase).toBe('playing')

    const round = state().round
    expect(round).not.toBeNull()
    expect(round?.index).toBe(1)
    expect((round?.endsAt ?? 0) - (round?.startedAt ?? 0)).toBe(ROUND_DURATION_MS)
  })

  it('creates a Bulgarian room with Cyrillic targets', () => {
    const { store, state } = setup()
    const created = store.createRoom('p1', 'Alice', 's1', 'bg')
    const code = created.code

    if (!code) {
      throw new Error('Room was not created')
    }

    store.sync(code)
    expect(state().language).toBe('bg')

    expect(store.startGame('p1').ok).toBe(true)
    const target = state().round?.target ?? ''
    expect(target).toMatch(/^[а-я]{2,4}$/)
  })

  it('scores the first valid word and ends the round when everyone is locked in', () => {
    const { store, state, code } = createLobby()
    store.startGame('p1')

    const target = state().round?.target ?? ''
    const word = wordFor(target)

    const first = store.submit('p1', word)
    expect(first.ok).toBe(true)
    expect(first.outcome?.points).toBeGreaterThan(0)
    expect(state().players.find((player) => player.id === 'p1')?.submitted).toBe(true)

    const duplicate = store.submit('p2', word)
    expect(duplicate.ok).toBe(false)
    expect(duplicate.reason).toBe('duplicate')

    const second = store.submit('p2', `${word}x`)
    expect(second.ok).toBe(true)
    expect(state().phase).toBe('reveal')
    expect(state().round?.submissions).toHaveLength(2)
    expect(state().round?.winnerId).toBe('p1')
    expect(store.nextRound('p1').ok).toBe(true)
    expect(state().phase).toBe('playing')
    expect(state().roundNumber).toBe(2)
    expect(code).toBe(state().code)
  })

  it('rejects words that miss the target or arrive after time is up', () => {
    const { store, state } = createLobby()
    store.startGame('p1')

    const target = state().round?.target ?? ''
    const missing = store.submit('p1', 'qqqq')
    expect(missing.ok).toBe(false)
    expect(missing.reason).toBe('missing-target')

    vi.advanceTimersByTime(ROUND_DURATION_MS)

    const late = store.submit('p2', wordFor(target))
    expect(late.ok).toBe(false)
    expect(late.reason).toBe('round-closed')
  })

  it('ends the round when the timer expires', () => {
    const { store, state } = createLobby()
    store.startGame('p1')

    expect(state().phase).toBe('playing')
    vi.advanceTimersByTime(ROUND_DURATION_MS)
    expect(state().phase).toBe('reveal')
  })

  it('finishes after the configured number of rounds and can restart', () => {
    const { store, state } = createLobby()
    store.startGame('p1')

    for (let round = 1; round <= DEFAULT_MAX_ROUNDS; round += 1) {
      vi.advanceTimersByTime(ROUND_DURATION_MS)

      if (round < DEFAULT_MAX_ROUNDS) {
        expect(state().phase).toBe('reveal')
        expect(store.nextRound('p1').ok).toBe(true)
        expect(state().phase).toBe('playing')
      }
    }

    expect(state().phase).toBe('finished')

    expect(store.restart('p1').ok).toBe(true)
    expect(state().phase).toBe('lobby')
    expect(state().round).toBeNull()
    expect(state().players.every((player) => player.score === 0)).toBe(true)
  })

  it('only lets the host control the game', () => {
    const { store, state } = createLobby()

    expect(store.startGame('p2').ok).toBe(false)
    expect(store.startGame('p1').ok).toBe(true)

    vi.advanceTimersByTime(ROUND_DURATION_MS)
    expect(state().phase).toBe('reveal')
    expect(store.nextRound('p2').ok).toBe(false)
    expect(store.nextRound('p1').ok).toBe(true)
  })

  it('lets new players spectate mid-game but allows a reconnect', () => {
    const { store, state, code } = createLobby()
    store.startGame('p1')

    expect(store.joinRoom('p3', 'Cara', code, 's3').ok).toBe(true)
    expect(state().players.find((player) => player.id === 'p3')?.spectator).toBe(true)

    store.handleDisconnect('p1', 's1')
    expect(state().players.find((player) => player.id === 'p1')?.connected).toBe(false)

    expect(store.joinRoom('p1', 'Alice', code, 's4').ok).toBe(true)
    store.sync(code)
    expect(state().players.find((player) => player.id === 'p1')?.connected).toBe(true)
  })

  it('promotes another connected player when the host leaves', () => {
    const { store, state } = createLobby()

    store.leaveRoom('p1')
    expect(state().hostId).toBe('p2')
    expect(state().players).toHaveLength(1)
  })

  it('lets the host add and remove bots in the lobby', () => {
    const { store, state } = createLobby()

    expect(store.addBots('p2', 1).ok).toBe(false)
    expect(store.addBots('p1', 2).ok).toBe(true)
    expect(state().players.filter((player) => player.isBot)).toHaveLength(2)

    const bot = state().players.find((player) => player.isBot)
    expect(bot).toBeDefined()

    expect(store.removeBot('p2', bot?.id ?? '').ok).toBe(false)
    expect(store.removeBot('p1', bot?.id ?? '').ok).toBe(true)
    expect(state().players.filter((player) => player.isBot)).toHaveLength(1)
    expect(store.removeBot('p1', 'p1').ok).toBe(false)
  })

  it('auto-fills a solo lobby with bots when the game starts', () => {
    const { store, state } = setup()
    const created = store.createRoom('p1', 'Alice', 's1')
    const code = created.code

    if (!code) {
      throw new Error('Room was not created')
    }

    store.sync(code)
    expect(state().players).toHaveLength(1)

    expect(store.startGame('p1').ok).toBe(true)
    expect(state().phase).toBe('playing')
    expect(state().players).toHaveLength(4)
    expect(state().players.filter((player) => player.isBot)).toHaveLength(3)
  })

  it('lets bots submit words during a round', () => {
    const { store, state } = setup()
    const created = store.createRoom('p1', 'Alice', 's1')
    const code = created.code

    if (!code) {
      throw new Error('Room was not created')
    }

    expect(store.addBots('p1', 2).ok).toBe(true)
    store.sync(code)
    expect(store.startGame('p1').ok).toBe(true)

    vi.advanceTimersByTime(ROUND_DURATION_MS)

    const final = state()
    expect(final.phase).toBe('reveal')

    const botIds = new Set(
      final.players.filter((player) => player.isBot).map((player) => player.id),
    )
    const botSubmissions = final.round?.submissions.filter((submission) =>
      botIds.has(submission.playerId),
    )

    expect(botSubmissions).toHaveLength(2)
    expect(final.players.filter((player) => player.isBot).every((player) => player.score > 0)).toBe(
      true,
    )
  })

  it('hurries bots once every human has submitted', () => {
    const { store, state } = setup()
    const created = store.createRoom('p1', 'Alice', 's1')
    const code = created.code

    if (!code) {
      throw new Error('Room was not created')
    }

    expect(store.addBots('p1', 2).ok).toBe(true)
    store.sync(code)
    expect(store.startGame('p1').ok).toBe(true)

    const target = state().round?.target ?? ''
    expect(store.submit('p1', wordFor(target)).ok).toBe(true)

    vi.advanceTimersByTime(3500)

    expect(state().phase).toBe('reveal')
    expect(state().round?.submissions).toHaveLength(3)
  })

  it('never makes a bot the host', () => {
    const { store, state } = createLobby()

    expect(store.addBots('p1', 1).ok).toBe(true)
    store.leaveRoom('p1')

    expect(state().hostId).toBe('p2')
    expect(state().players.find((player) => player.id === state().hostId)?.isBot).toBe(false)
  })

  it('deletes a room once only bots are left', () => {
    const { store } = setup()
    const created = store.createRoom('p1', 'Alice', 's1')
    const code = created.code

    if (!code) {
      throw new Error('Room was not created')
    }

    expect(store.addBots('p1', 2).ok).toBe(true)
    store.leaveRoom('p1')

    expect(store.joinRoom('p2', 'Bob', code, 's2').ok).toBe(false)
  })

  it('cleans up bot-filled rooms when every human disconnects', () => {
    const { store, state } = setup()
    const created = store.createRoom('p1', 'Alice', 's1')
    const code = created.code

    if (!code) {
      throw new Error('Room was not created')
    }

    expect(store.addBots('p1', 2).ok).toBe(true)
    store.sync(code)
    store.handleDisconnect('p1', 's1')

    expect(state().players.find((player) => player.id === 'p1')?.connected).toBe(false)

    vi.advanceTimersByTime(5 * 60_000)
    expect(store.joinRoom('p2', 'Bob', code, 's2').ok).toBe(false)
  })

  it('lets only the host update and clamps match settings in the lobby', () => {
    const { store, state } = createLobby()

    expect(store.updateSettings('p2', { mode: 'blitz' }).ok).toBe(false)

    const updated = store.updateSettings('p1', {
      mode: 'blitz',
      maxRounds: MAX_ROUNDS + 5,
      minWordLength: MIN_WORD_LENGTH_SETTING - 1,
      roundDurationMs: MIN_ROUND_DURATION_MS - 1000,
    })
    expect(updated.ok).toBe(true)

    const settings = state().settings
    expect(settings.mode).toBe('blitz')
    expect(settings.maxRounds).toBe(MAX_ROUNDS)
    expect(settings.minWordLength).toBe(MIN_WORD_LENGTH_SETTING)
    expect(settings.roundDurationMs).toBe(MIN_ROUND_DURATION_MS)

    store.startGame('p1')
    expect(store.updateSettings('p1', { mode: 'classic' }).ok).toBe(false)
  })

  it('uses the same daily targets for every room', () => {
    const first = setup()
    const second = setup()
    const a = first.store.createRoom('p1', 'Alice', 's1', 'en', true).code
    const b = second.store.createRoom('p2', 'Bob', 's2', 'en', true).code

    if (!a || !b) {
      throw new Error('Room was not created')
    }

    first.store.startGame('p1')
    second.store.startGame('p2')

    expect(first.state().daily).toBe(true)
    expect(first.state().round?.target).toBe(second.state().round?.target)
  })

  it('lets a late joiner take over a bot seat mid-game', () => {
    const { store, state } = setup()
    const created = store.createRoom('p1', 'Alice', 's1')
    const code = created.code

    if (!code) {
      throw new Error('Room was not created')
    }

    expect(store.addBots('p1', 2).ok).toBe(true)
    store.sync(code)
    expect(store.startGame('p1').ok).toBe(true)

    const botsBefore = state().players.filter((player) => player.isBot).length
    expect(store.joinRoom('p3', 'Cara', code, 's3').ok).toBe(true)

    const cara = state().players.find((player) => player.id === 'p3')
    expect(cara?.spectator).toBe(false)
    expect(state().players.filter((player) => player.isBot)).toHaveLength(botsBefore - 1)
  })

  it('tracks streaks and doubles the next word with the double power-up', () => {
    const { store, state } = createLobby()
    const random = vi.spyOn(Math, 'random').mockReturnValue(0)
    try {
      store.startGame('p1')

      const target = state().round?.target ?? ''
      expect(store.usePowerUp('p1', 'double').ok).toBe(true)
      const first = store.submit('p1', wordFor(target))
      expect(first.outcome?.multiplier).toBe(2)
      expect(first.outcome?.streak).toBe(1)

      const player = state().players.find((candidate) => candidate.id === 'p1')
      expect(player?.doubleNext).toBe(false)
      expect(player?.powerUpUsed).toBe(true)
    } finally {
      random.mockRestore()
    }
  })

  it('adds five seconds with the extra time power-up', () => {
    const { store, state } = createLobby()
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.7)
    try {
      store.startGame('p1')
      const before = state().round?.endsAt ?? 0

      expect(store.usePowerUp('p1', 'extraTime').ok).toBe(true)
      expect(state().round?.endsAt).toBe(before + 5000)
      expect(store.usePowerUp('p1', 'extraTime').ok).toBe(false)
    } finally {
      random.mockRestore()
    }
  })

  it('accepts multiple words per round in rush mode', () => {
    const { store, state } = createLobby()
    store.updateSettings('p1', { mode: 'rush' })
    store.startGame('p1')

    const target = state().round?.target ?? ''
    const first = wordFor(target)
    const second = `${first}x`

    expect(store.submit('p1', first).ok).toBe(true)
    expect(store.submit('p1', second).ok).toBe(true)
    expect(state().phase).toBe('playing')
    expect(state().round?.submissions).toHaveLength(2)
  })

  it('keeps bots submitting words during a rush round', () => {
    const { store, state } = setup()
    const created = store.createRoom('p1', 'Alice', 's1')
    const code = created.code

    if (!code) {
      throw new Error('Room was not created')
    }

    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5)
    try {
      expect(store.addBots('p1', 1).ok).toBe(true)
      store.updateSettings('p1', { mode: 'rush' })
      expect(store.startGame('p1').ok).toBe(true)

      vi.advanceTimersByTime(ROUND_DURATION_MS - 500)

      const botIds = new Set(
        state()
          .players.filter((player) => player.isBot)
          .map((player) => player.id),
      )
      const botSubmissions =
        state().round?.submissions.filter((submission) =>
          botIds.has(submission.playerId),
        ) ?? []

      expect(botSubmissions.length).toBeGreaterThan(1)
    } finally {
      random.mockRestore()
    }
  })

  it('resets spectator seats and power-ups on restart', () => {
    const { store, state } = createLobby()
    store.startGame('p1')
    expect(store.restart('p1').ok).toBe(true)

    expect(state().phase).toBe('lobby')
    expect(state().players.every((player) => player.powerUp === null)).toBe(true)
    expect(state().players.every((player) => !player.spectator)).toBe(true)
  })

  it('broadcasts chat messages with collapsed whitespace', () => {
    const { store, state } = createLobby()

    expect(store.sendChat('p1', '  hello   room  ').ok).toBe(true)

    const message = state().chat.at(-1)
    expect(message?.playerId).toBe('p1')
    expect(message?.playerName).toBe('Alice')
    expect(message?.text).toBe('hello room')
  })

  it('filters blocked words from chat', () => {
    const { store, state } = createLobby()

    expect(store.sendChat('p1', 'fuck this').ok).toBe(true)
    expect(state().chat.at(-1)?.text).toBe('**** this')
  })

  it('rate limits chat messages per player', () => {
    const { store, state } = createLobby()

    expect(store.sendChat('p1', 'first').ok).toBe(true)
    expect(store.sendChat('p1', 'second').ok).toBe(false)
    expect(state().chat).toHaveLength(1)

    vi.advanceTimersByTime(1000)
    expect(store.sendChat('p1', 'second').ok).toBe(true)
    expect(state().chat).toHaveLength(2)
  })

  it('rejects empty chat messages', () => {
    const { store, state } = createLobby()

    expect(store.sendChat('p1', '   ').ok).toBe(false)
    expect(state().chat).toHaveLength(0)
  })
})
