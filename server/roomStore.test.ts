import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_MAX_ROUNDS, ROUND_DURATION_MS } from '../shared/game'
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

  it('blocks new players mid-game but allows a reconnect', () => {
    const { store, state, code } = createLobby()
    store.startGame('p1')

    expect(store.joinRoom('p3', 'Cara', code, 's3').ok).toBe(false)

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
})
