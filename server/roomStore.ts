import type { ActionResult, SubmitResult } from '../shared/events'
import {
  DEFAULT_MAX_ROUNDS,
  ROUND_DURATION_MS,
  describeReason,
  pickTargets,
  scoreWord,
  validateWord,
} from '../shared/game'
import type { GamePhase, Player, RoomState, RoundState } from '../shared/types'

interface Room {
  code: string
  hostId: string
  phase: GamePhase
  players: Map<string, Player>
  round: RoundState | null
  roundNumber: number
  maxRounds: number
  targetQueue: string[]
  usedWords: Set<string>
  roundTimer: NodeJS.Timeout | null
  emptyTimer: NodeJS.Timeout | null
}

export type Broadcast = (code: string, state: RoomState) => void

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 4
const EMPTY_ROOM_TTL_MS = 5 * 60_000
const MAX_PLAYERS = 12
const MAX_NAME_LENGTH = 16

const sanitizeName = (raw: string): string => {
  const trimmed = raw.trim().slice(0, MAX_NAME_LENGTH)
  return trimmed.length > 0 ? trimmed : 'Player'
}

const makePlayer = (id: string, name: string): Player => ({
  id,
  name: sanitizeName(name),
  score: 0,
  isHost: false,
  connected: true,
  submitted: false,
})

export class RoomStore {
  private rooms: Map<string, Room> = new Map()
  private playerRooms: Map<string, string> = new Map()
  private playerSockets: Map<string, string> = new Map()
  private broadcast: Broadcast
  private isWord: (word: string) => boolean

  constructor(broadcast: Broadcast, isWord: (word: string) => boolean) {
    this.broadcast = broadcast
    this.isWord = isWord
  }

  createRoom = (playerId: string, name: string, socketId: string): ActionResult => {
    this.leaveRoom(playerId)

    let code = this.randomCode()
    while (this.rooms.has(code)) {
      code = this.randomCode()
    }

    const room: Room = {
      code,
      hostId: playerId,
      phase: 'lobby',
      players: new Map([[playerId, makePlayer(playerId, name)]]),
      round: null,
      roundNumber: 0,
      maxRounds: DEFAULT_MAX_ROUNDS,
      targetQueue: [],
      usedWords: new Set(),
      roundTimer: null,
      emptyTimer: null,
    }

    this.rooms.set(code, room)
    this.playerRooms.set(playerId, code)
    this.playerSockets.set(playerId, socketId)

    return { ok: true, code }
  }

  joinRoom = (playerId: string, name: string, rawCode: string, socketId: string): ActionResult => {
    const code = rawCode.trim().toUpperCase()
    const room = this.rooms.get(code)

    if (!room) {
      return { ok: false, error: 'No room with that code' }
    }

    const existing = room.players.get(playerId)

    if (existing) {
      existing.connected = true
      existing.name = sanitizeName(name)
      this.clearEmptyTimer(room)
      this.playerRooms.set(playerId, code)
      this.playerSockets.set(playerId, socketId)
      this.reassignHost(room)
      return { ok: true, code }
    }

    if (room.phase !== 'lobby') {
      return { ok: false, error: 'That game is already in progress' }
    }

    if (room.players.size >= MAX_PLAYERS) {
      return { ok: false, error: 'That room is full' }
    }

    const current = this.playerRooms.get(playerId)
    if (current && current !== code) {
      this.leaveRoom(playerId)
    }

    room.players.set(playerId, makePlayer(playerId, name))
    this.clearEmptyTimer(room)
    this.playerRooms.set(playerId, code)
    this.playerSockets.set(playerId, socketId)

    return { ok: true, code }
  }

  sync = (code: string): void => {
    const room = this.rooms.get(code)
    if (room) {
      this.broadcast(room.code, this.toPublicState(room))
    }
  }

  startGame = (playerId: string): ActionResult => {
    const room = this.roomOf(playerId)
    if (!room) {
      return { ok: false, error: 'You are not in a room' }
    }
    if (room.hostId !== playerId) {
      return { ok: false, error: 'Only the host can start the game' }
    }
    if (room.phase !== 'lobby') {
      return { ok: false, error: 'The game already started' }
    }

    room.roundNumber = 0
    room.usedWords.clear()
    room.targetQueue = pickTargets(Math.random, room.maxRounds)
    room.players.forEach((player) => {
      player.score = 0
      player.submitted = false
    })

    this.startRound(room)
    return { ok: true }
  }

  nextRound = (playerId: string): ActionResult => {
    const room = this.roomOf(playerId)
    if (!room) {
      return { ok: false, error: 'You are not in a room' }
    }
    if (room.hostId !== playerId) {
      return { ok: false, error: 'Only the host can start the next round' }
    }
    if (room.phase !== 'reveal') {
      return { ok: false, error: 'No round is ready to start' }
    }

    this.startRound(room)
    return { ok: true }
  }

  restart = (playerId: string): ActionResult => {
    const room = this.roomOf(playerId)
    if (!room) {
      return { ok: false, error: 'You are not in a room' }
    }
    if (room.hostId !== playerId) {
      return { ok: false, error: 'Only the host can restart the game' }
    }

    this.clearRoundTimer(room)
    room.phase = 'lobby'
    room.round = null
    room.roundNumber = 0
    room.usedWords.clear()
    room.targetQueue = []
    room.players.forEach((player) => {
      player.score = 0
      player.submitted = false
    })

    this.sync(room.code)
    return { ok: true }
  }

  submit = (playerId: string, rawWord: string): SubmitResult => {
    const room = this.roomOf(playerId)
    if (!room) {
      return { ok: false, error: 'You are not in a room' }
    }
    if (room.phase !== 'playing' || !room.round) {
      return { ok: false, reason: 'round-closed', error: describeReason('round-closed') }
    }

    const player = room.players.get(playerId)
    if (!player) {
      return { ok: false, error: 'You are not in this room' }
    }
    if (player.submitted) {
      return { ok: false, reason: 'already-submitted', error: describeReason('already-submitted') }
    }

    const msLeft = room.round.endsAt - Date.now()
    if (msLeft <= 0) {
      this.endRound(room.code)
      return { ok: false, reason: 'round-closed', error: describeReason('round-closed') }
    }

    const validation = validateWord({
      word: rawWord,
      target: room.round.target,
      usedWords: room.usedWords,
      isDictionaryWord: this.isWord,
    })

    if (!validation.valid) {
      return {
        ok: false,
        reason: validation.reason ?? undefined,
        error: describeReason(validation.reason),
      }
    }

    const isFirst = room.round.submissions.length === 0
    const points = scoreWord({
      wordLength: validation.normalized.length,
      msLeft,
      durationMs: room.round.durationMs,
      isFirst,
    })

    player.submitted = true
    player.score += points
    room.round.submissions.push({
      playerId,
      playerName: player.name,
      word: validation.normalized,
      points,
      at: Date.now(),
    })
    if (isFirst) {
      room.round.winnerId = playerId
    }
    room.usedWords.add(validation.normalized)

    this.sync(room.code)
    this.maybeEndRound(room)

    return {
      ok: true,
      outcome: {
        accepted: true,
        word: validation.normalized,
        points,
        reason: null,
      },
    }
  }

  leaveRoom = (playerId: string): void => {
    const code = this.playerRooms.get(playerId)
    if (!code) {
      return
    }

    const room = this.rooms.get(code)
    if (room) {
      room.players.delete(playerId)
      this.reassignHost(room)

      if (room.players.size === 0) {
        this.deleteRoom(room.code)
      } else {
        this.sync(room.code)
        this.maybeEndRound(room)
      }
    }

    this.playerRooms.delete(playerId)
    this.playerSockets.delete(playerId)
  }

  handleDisconnect = (playerId: string, socketId: string): void => {
    if (this.playerSockets.get(playerId) !== socketId) {
      return
    }

    const code = this.playerRooms.get(playerId)
    if (!code) {
      return
    }

    const room = this.rooms.get(code)
    const player = room?.players.get(playerId)
    if (!room || !player) {
      return
    }

    player.connected = false
    this.playerSockets.delete(playerId)
    this.reassignHost(room)
    this.scheduleEmptyCleanup(room)
    this.sync(code)
    this.maybeEndRound(room)
  }

  private startRound = (room: Room): void => {
    room.roundNumber += 1
    const target = room.targetQueue[room.roundNumber - 1] ?? pickTargets(Math.random, 1)[0] ?? 'ar'
    const now = Date.now()

    room.players.forEach((player) => {
      player.submitted = false
    })

    room.round = {
      index: room.roundNumber,
      target,
      startedAt: now,
      endsAt: now + ROUND_DURATION_MS,
      durationMs: ROUND_DURATION_MS,
      submissions: [],
      winnerId: null,
    }
    room.phase = 'playing'

    this.clearRoundTimer(room)
    room.roundTimer = setTimeout(() => this.endRound(room.code), ROUND_DURATION_MS)

    this.sync(room.code)
  }

  private endRound = (code: string): void => {
    const room = this.rooms.get(code)
    if (!room || room.phase !== 'playing') {
      return
    }

    this.clearRoundTimer(room)
    room.phase = room.roundNumber >= room.maxRounds ? 'finished' : 'reveal'
    this.sync(code)
  }

  private maybeEndRound = (room: Room): void => {
    if (room.phase !== 'playing') {
      return
    }

    const connected = [...room.players.values()].filter((player) => player.connected)
    if (connected.length === 0) {
      return
    }

    if (connected.every((player) => player.submitted)) {
      this.endRound(room.code)
    }
  }

  private reassignHost = (room: Room): void => {
    const host = room.players.get(room.hostId)
    if (host?.connected) {
      return
    }

    const next = [...room.players.values()].find((player) => player.connected)
    if (next) {
      room.hostId = next.id
    }
  }

  private scheduleEmptyCleanup = (room: Room): void => {
    const anyConnected = [...room.players.values()].some((player) => player.connected)
    if (anyConnected) {
      this.clearEmptyTimer(room)
      return
    }

    if (room.emptyTimer) {
      return
    }

    room.emptyTimer = setTimeout(() => this.deleteRoom(room.code), EMPTY_ROOM_TTL_MS)
  }

  private deleteRoom = (code: string): void => {
    const room = this.rooms.get(code)
    if (!room) {
      return
    }

    this.clearRoundTimer(room)
    this.clearEmptyTimer(room)
    room.players.forEach((_player, id) => {
      this.playerRooms.delete(id)
      this.playerSockets.delete(id)
    })
    this.rooms.delete(code)
  }

  private clearRoundTimer = (room: Room): void => {
    if (room.roundTimer) {
      clearTimeout(room.roundTimer)
      room.roundTimer = null
    }
  }

  private clearEmptyTimer = (room: Room): void => {
    if (room.emptyTimer) {
      clearTimeout(room.emptyTimer)
      room.emptyTimer = null
    }
  }

  private roomOf = (playerId: string): Room | undefined => {
    const code = this.playerRooms.get(playerId)
    return code ? this.rooms.get(code) : undefined
  }

  private randomCode = (): string => {
    let code = ''
    for (let i = 0; i < CODE_LENGTH; i += 1) {
      const index = Math.floor(Math.random() * CODE_ALPHABET.length)
      code += CODE_ALPHABET[index] ?? 'A'
    }
    return code
  }

  private toPublicState = (room: Room): RoomState => ({
    code: room.code,
    phase: room.phase,
    hostId: room.hostId,
    players: [...room.players.values()]
      .map((player) => ({ ...player, isHost: player.id === room.hostId }))
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)),
    round: room.round,
    roundNumber: room.roundNumber,
    maxRounds: room.maxRounds,
    serverTime: Date.now(),
  })
}
