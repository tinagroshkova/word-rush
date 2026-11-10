import type { LanguageCode } from './languages'

export type GamePhase = 'lobby' | 'playing' | 'reveal' | 'finished'

export type ValidationReason =
  | 'too-short'
  | 'too-long'
  | 'missing-target'
  | 'not-a-word'
  | 'duplicate'
  | 'already-submitted'
  | 'round-closed'
  | 'spectating'

export type GameMode = 'classic' | 'blitz' | 'marathon' | 'rush'

export type Difficulty = 'easy' | 'normal' | 'hard'

export type PowerUpType = 'double' | 'hint' | 'extraTime'

export type BotPersonality = 'speedster' | 'scholar' | 'steady'

export interface RoomSettings {
  maxRounds: number
  roundDurationMs: number
  minWordLength: number
  difficulty: Difficulty
  mode: GameMode
}

export interface Player {
  id: string
  name: string
  score: number
  isHost: boolean
  isBot: boolean
  connected: boolean
  submitted: boolean
  streak: number
  bestStreak: number
  misses: number
  powerUp: PowerUpType | null
  powerUpUsed: boolean
  doubleNext: boolean
  spectator: boolean
  personality?: BotPersonality
}

export interface Submission {
  playerId: string
  playerName: string
  word: string
  points: number
  at: number
  streak: number
  multiplier: number
}

export interface RoundState {
  index: number
  target: string
  startedAt: number
  endsAt: number
  durationMs: number
  submissions: Submission[]
  winnerId: string | null
  mode: GameMode
  minWordLength: number
}

export interface RoomState {
  code: string
  phase: GamePhase
  hostId: string
  language: LanguageCode
  players: Player[]
  round: RoundState | null
  roundNumber: number
  maxRounds: number
  settings: RoomSettings
  daily: boolean
  serverTime: number
}

export interface SubmitOutcome {
  accepted: boolean
  word: string
  points: number
  reason: ValidationReason | null
  streak: number
  multiplier: number
}
