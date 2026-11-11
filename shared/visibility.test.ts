import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from './game'
import type { Player, RoomState, Submission } from './types'
import { maskRoomStateForPlayer } from './visibility'

const submission = (playerId: string): Submission => ({
  playerId,
  playerName: playerId,
  word: 'word',
  points: 100,
  at: 0,
  streak: 1,
  multiplier: 1,
})

const player = (id: string, name: string, overrides: Partial<Player> = {}): Player => ({
  id,
  name,
  score: 0,
  isHost: false,
  isBot: false,
  connected: true,
  submitted: false,
  streak: 0,
  bestStreak: 0,
  misses: 0,
  powerUp: null,
  powerUpUsed: false,
  doubleNext: false,
  spectator: false,
  ...overrides,
})

const makeState = (overrides: Partial<RoomState> = {}): RoomState => ({
  code: 'ABCD',
  phase: 'playing',
  hostId: 'p1',
  language: 'en',
  players: [
    player('p1', 'Alice', { isHost: true }),
    player('p2', 'Bob', { submitted: true }),
  ],
  round: {
    index: 1,
    target: 'ar',
    startedAt: 0,
    endsAt: 1000,
    durationMs: 1000,
    submissions: [submission('p2')],
    winnerId: 'p2',
    mode: 'classic',
    minWordLength: 4,
  },
  roundNumber: 1,
  maxRounds: 5,
  settings: DEFAULT_SETTINGS,
  daily: false,
  chat: [],
  serverTime: 0,
  ...overrides,
})

describe('maskRoomStateForPlayer', () => {
  it('hides submissions from a player who has not submitted yet', () => {
    const masked = maskRoomStateForPlayer(makeState(), 'p1')
    expect(masked.round?.submissions).toEqual([])
  })

  it('shows submissions once the viewer has submitted', () => {
    const state = makeState()
    state.players[0] = { ...state.players[0]!, submitted: true }

    expect(maskRoomStateForPlayer(state, 'p1').round?.submissions).toHaveLength(1)
  })

  it('shows submissions outside the playing phase', () => {
    const state = makeState({ phase: 'reveal' })
    expect(maskRoomStateForPlayer(state, 'p1').round?.submissions).toHaveLength(1)
  })
})
