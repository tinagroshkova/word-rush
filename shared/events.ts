import type { RoomState, SubmitOutcome, ValidationReason } from './types'

export interface ActionResult {
  ok: boolean
  error?: string
  code?: string
}

export interface SubmitResult extends ActionResult {
  outcome?: SubmitOutcome
  reason?: ValidationReason
}

export interface CreateRoomPayload {
  playerId: string
  name: string
}

export interface JoinRoomPayload {
  playerId: string
  name: string
  code: string
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

export interface ServerToClientEvents {
  'state:update': (state: RoomState) => void
  'room:closed': () => void
  notice: (message: string) => void
}

export interface ClientToServerEvents {
  'room:create': (payload: CreateRoomPayload, ack: (result: ActionResult) => void) => void
  'room:join': (payload: JoinRoomPayload, ack: (result: ActionResult) => void) => void
  'room:leave': (ack: (result: ActionResult) => void) => void
  'room:addBots': (payload: AddBotsPayload, ack: (result: ActionResult) => void) => void
  'room:removeBot': (payload: RemoveBotPayload, ack: (result: ActionResult) => void) => void
  'game:start': (ack: (result: ActionResult) => void) => void
  'game:next': (ack: (result: ActionResult) => void) => void
  'game:restart': (ack: (result: ActionResult) => void) => void
  'word:submit': (payload: SubmitWordPayload, ack: (result: SubmitResult) => void) => void
}
