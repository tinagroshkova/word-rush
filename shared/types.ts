export type GamePhase = 'lobby' | 'playing' | 'reveal' | 'finished'

export type ValidationReason =
  | 'too-short'
  | 'too-long'
  | 'missing-target'
  | 'not-a-word'
  | 'duplicate'
  | 'already-submitted'
  | 'round-closed'

export interface Player {
  id: string
  name: string
  score: number
  isHost: boolean
  connected: boolean
  submitted: boolean
}

export interface Submission {
  playerId: string
  playerName: string
  word: string
  points: number
  at: number
}

export interface RoundState {
  index: number
  target: string
  startedAt: number
  endsAt: number
  durationMs: number
  submissions: Submission[]
  winnerId: string | null
}

export interface RoomState {
  code: string
  phase: GamePhase
  hostId: string
  players: Player[]
  round: RoundState | null
  roundNumber: number
  maxRounds: number
  serverTime: number
}

export interface SubmitOutcome {
  accepted: boolean
  word: string
  points: number
  reason: ValidationReason | null
}
