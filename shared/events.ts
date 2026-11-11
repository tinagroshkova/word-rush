import type { LanguageCode } from './languages'
import type {
  PowerUpType,
  RoomSettings,
  RoomState,
  SubmitOutcome,
  ValidationReason,
} from './types'

export interface ActionResult {
  ok: boolean
  error?: string
  code?: string
}

export interface SubmitResult extends ActionResult {
  outcome?: SubmitOutcome
  reason?: ValidationReason
  hint?: string
}

export interface PowerUpResult extends ActionResult {
  hint?: string
  message?: string
}

export interface CreateRoomPayload {
  playerId: string
  name: string
  language?: LanguageCode
  daily?: boolean
}

export interface JoinRoomPayload {
  playerId: string
  name: string
  code: string
  language?: LanguageCode
}

export interface SubmitWordPayload {
  word: string
}

export interface AddBotsPayload {
  count: number
}

export interface RemoveBotPayload {
  botId: string
}

export interface UpdateSettingsPayload {
  settings: Partial<RoomSettings>
}

export interface UsePowerUpPayload {
  type: PowerUpType
}

export interface EmotePayload {
  emoji: string
}

export interface SendChatPayload {
  text: string
}

export interface EmoteEvent {
  playerId: string
  playerName: string
  emoji: string
  at: number
}

export interface ServerToClientEvents {
  'state:update': (state: RoomState) => void
  'room:closed': () => void
  emote: (event: EmoteEvent) => void
  notice: (message: string) => void
}

export interface ClientToServerEvents {
  'room:create': (payload: CreateRoomPayload, ack: (result: ActionResult) => void) => void
  'room:join': (payload: JoinRoomPayload, ack: (result: ActionResult) => void) => void
  'room:leave': (ack: (result: ActionResult) => void) => void
  'room:addBots': (payload: AddBotsPayload, ack: (result: ActionResult) => void) => void
  'room:removeBot': (payload: RemoveBotPayload, ack: (result: ActionResult) => void) => void
  'room:updateSettings': (
    payload: UpdateSettingsPayload,
    ack: (result: ActionResult) => void,
  ) => void
  'game:start': (ack: (result: ActionResult) => void) => void
  'game:next': (ack: (result: ActionResult) => void) => void
  'game:restart': (ack: (result: ActionResult) => void) => void
  'word:submit': (payload: SubmitWordPayload, ack: (result: SubmitResult) => void) => void
  'powerup:use': (payload: UsePowerUpPayload, ack: (result: PowerUpResult) => void) => void
  'emote:send': (payload: EmotePayload) => void
  'chat:send': (payload: SendChatPayload, ack: (result: ActionResult) => void) => void
}
