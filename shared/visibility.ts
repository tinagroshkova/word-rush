import type { RoomState } from './types'

export const maskRoomStateForPlayer = (
  state: RoomState,
  playerId: string | undefined,
): RoomState => {
  if (state.phase !== 'playing' || !state.round) {
    return state
  }

  const viewer = playerId ? state.players.find((player) => player.id === playerId) : undefined
  if (viewer?.submitted || state.round.submissions.length === 0) {
    return state
  }

  return {
    ...state,
    round: { ...state.round, submissions: [] },
  }
}
