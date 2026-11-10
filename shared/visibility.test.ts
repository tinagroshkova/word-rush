import { describe, expect, it } from 'vitest'
import type { RoomState, Submission } from './types'
import { maskRoomStateForPlayer } from './visibility'

const submission = (playerId: string): Submission => ({
  playerId,
  playerName: playerId,
  word: 'word',
  points: 100,
  at: 0,
})

const makeState = (overrides: Partial<RoomState> = {}): RoomState => ({
  code: 'ABCD',
  phase: 'playing',
  hostId: 'p1',
  language: 'en',
  players: [
    {
      id: 'p1',
      name: 'Alice',
      score: 0,
      isHost: true,
      isBot: false,
      connected: true,
      submitted: false,
    },
    {
      id: 'p2',
      name: 'Bob',
      score: 0,
      isHost: false,
      isBot: false,
      connected: true,
      submitted: true,
    },
  ],
  round: {
    index: 1,
    target: 'ar',
    startedAt: 0,
    endsAt: 1000,
    durationMs: 1000,
    submissions: [submission('p2')],
    winnerId: 'p2',
  },
  roundNumber: 1,
  maxRounds: 5,
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
