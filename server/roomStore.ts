import type { ActionResult, SubmitResult } from '../shared/events'
import {
  DEFAULT_MAX_ROUNDS,
  ROUND_DURATION_MS,
  TARGET_POOLS,
  describeReason,
  pickTargets,
  scoreWord,
  validateWord,
} from '../shared/game'
import { translate } from '../shared/i18n'
import { DEFAULT_LANGUAGE, type LanguageCode } from '../shared/languages'
import type { GamePhase, Player, RoomState, RoundState } from '../shared/types'

interface Room {
  code: string
  hostId: string
  language: LanguageCode
  phase: GamePhase
  players: Map<string, Player>
  round: RoundState | null
  roundNumber: number
  maxRounds: number
  targetQueue: string[]
  usedWords: Set<string>
  roundTimer: NodeJS.Timeout | null
  emptyTimer: NodeJS.Timeout | null
  botSkills: Map<string, number>
  botTimers: Map<string, NodeJS.Timeout>
  botRush: boolean
  nextBotNumber: number
}

export type Broadcast = (code: string, state: RoomState) => void
export type WordChecker = (language: LanguageCode, word: string) => boolean
export type BotWordPicker = (
  language: LanguageCode,
  target: string,
  usedWords: ReadonlySet<string>,
) => string | null

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 4
const EMPTY_ROOM_TTL_MS = 5 * 60_000
const MAX_PLAYERS = 12
const MAX_NAME_LENGTH = 16
const BOT_FILL_COUNT = 3
const BOT_NAMES = [
  'Ada',
  'Byte',
  'Cipher',
  'Dash',
  'Echo',
  'Fable',
  'Glitch',
  'Hex',
  'Iris',
  'Jolt',
  'Kilo',
  'Luna',
] as const

const sanitizeName = (raw: string): string => {
  const trimmed = raw.trim().slice(0, MAX_NAME_LENGTH)
  return trimmed.length > 0 ? trimmed : 'Player'
}

const makePlayer = (id: string, name: string, isBot = false): Player => ({
  id,
  name: sanitizeName(name),
  score: 0,
  isHost: false,
  isBot,
  connected: true,
  submitted: false,
})

export class RoomStore {
  private rooms: Map<string, Room> = new Map()
  private playerRooms: Map<string, string> = new Map()
  private playerSockets: Map<string, string> = new Map()
  private playerLanguages: Map<string, LanguageCode> = new Map()
  private broadcast: Broadcast
  private isWord: WordChecker
  private pickBotWord: BotWordPicker

  constructor(
    broadcast: Broadcast,
    isWord: WordChecker,
    pickBotWord: BotWordPicker = () => null,
  ) {
    this.broadcast = broadcast
    this.isWord = isWord
    this.pickBotWord = pickBotWord
  }

  createRoom = (
    playerId: string,
    name: string,
    socketId: string,
    language: LanguageCode = DEFAULT_LANGUAGE,
  ): ActionResult => {
    this.leaveRoom(playerId)

    let code = this.randomCode()
    while (this.rooms.has(code)) {
      code = this.randomCode()
    }

    const room: Room = {
      code,
      hostId: playerId,
      language,
      phase: 'lobby',
      players: new Map([[playerId, makePlayer(playerId, name)]]),
      round: null,
      roundNumber: 0,
      maxRounds: DEFAULT_MAX_ROUNDS,
      targetQueue: [],
      usedWords: new Set(),
      roundTimer: null,
      emptyTimer: null,
      botSkills: new Map(),
      botTimers: new Map(),
      botRush: false,
      nextBotNumber: 1,
    }

    this.rooms.set(code, room)
    this.playerRooms.set(playerId, code)
    this.playerSockets.set(playerId, socketId)
    this.playerLanguages.set(playerId, language)

    return { ok: true, code }
  }

  joinRoom = (
    playerId: string,
    name: string,
    rawCode: string,
    socketId: string,
    language: LanguageCode = DEFAULT_LANGUAGE,
  ): ActionResult => {
    const code = rawCode.trim().toUpperCase()
    const room = this.rooms.get(code)

    if (!room) {
      return { ok: false, error: translate(language, 'error.noRoom') }
    }

    const existing = room.players.get(playerId)

    if (existing) {
      existing.connected = true
      existing.name = sanitizeName(name)
      this.clearEmptyTimer(room)
      this.playerRooms.set(playerId, code)
      this.playerSockets.set(playerId, socketId)
      this.playerLanguages.set(playerId, room.language)
      this.reassignHost(room)
      return { ok: true, code }
    }

    if (room.phase !== 'lobby') {
      return { ok: false, error: translate(room.language, 'error.inProgress') }
    }

    if (room.players.size >= MAX_PLAYERS) {
      return { ok: false, error: translate(room.language, 'error.roomFull') }
    }

    const current = this.playerRooms.get(playerId)
    if (current && current !== code) {
      this.leaveRoom(playerId)
    }

    room.players.set(playerId, makePlayer(playerId, name))
    this.clearEmptyTimer(room)
    this.playerRooms.set(playerId, code)
    this.playerSockets.set(playerId, socketId)
    this.playerLanguages.set(playerId, room.language)

    return { ok: true, code }
  }

  addBots = (playerId: string, count: number): ActionResult => {
    const room = this.roomOf(playerId)
    if (!room) {
      return { ok: false, error: translate(this.languageOf(playerId), 'error.notInRoom') }
    }
    if (room.hostId !== playerId) {
      return { ok: false, error: translate(room.language, 'error.hostAddBots') }
    }
    if (room.phase !== 'lobby') {
      return { ok: false, error: translate(room.language, 'error.botsLobby') }
    }
    if (room.players.size >= MAX_PLAYERS) {
      return { ok: false, error: translate(room.language, 'error.roomFull') }
    }

    const added = this.addBotsToRoom(room, count)
    if (added === 0) {
      return { ok: false, error: translate(room.language, 'error.addBot') }
    }

    this.sync(room.code)
    return { ok: true }
  }

  removeBot = (playerId: string, botId: string): ActionResult => {
    const room = this.roomOf(playerId)
    if (!room) {
      return { ok: false, error: translate(this.languageOf(playerId), 'error.notInRoom') }
    }
    if (room.hostId !== playerId) {
      return { ok: false, error: translate(room.language, 'error.hostRemoveBots') }
    }
    if (room.phase !== 'lobby') {
      return { ok: false, error: translate(room.language, 'error.botsRemoveLobby') }
    }

    const bot = room.players.get(botId)
    if (!bot?.isBot) {
      return { ok: false, error: translate(room.language, 'error.notBot') }
    }

    room.players.delete(botId)
    room.botSkills.delete(botId)
    this.playerRooms.delete(botId)
    this.playerSockets.delete(botId)
    this.playerLanguages.delete(botId)
    this.clearBotTimer(room, botId)
    this.sync(room.code)
    return { ok: true }
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
      return { ok: false, error: translate(this.languageOf(playerId), 'error.notInRoom') }
    }
    if (room.hostId !== playerId) {
      return { ok: false, error: translate(room.language, 'error.hostStart') }
    }
    if (room.phase !== 'lobby') {
      return { ok: false, error: translate(room.language, 'error.alreadyStarted') }
    }

    const hasOtherHumans = [...room.players.values()].some(
      (player) => player.id !== playerId && !player.isBot && player.connected,
    )
    const hasBots = [...room.players.values()].some((player) => player.isBot)
    if (!hasOtherHumans && !hasBots) {
      this.addBotsToRoom(room, BOT_FILL_COUNT)
    }

    room.roundNumber = 0
    room.usedWords.clear()
    room.targetQueue = pickTargets(Math.random, room.maxRounds, room.language)
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
      return { ok: false, error: translate(this.languageOf(playerId), 'error.notInRoom') }
    }
    if (room.hostId !== playerId) {
      return { ok: false, error: translate(room.language, 'error.hostNext') }
    }
    if (room.phase !== 'reveal') {
      return { ok: false, error: translate(room.language, 'error.noRound') }
    }

    this.startRound(room)
    return { ok: true }
  }

  restart = (playerId: string): ActionResult => {
    const room = this.roomOf(playerId)
    if (!room) {
      return { ok: false, error: translate(this.languageOf(playerId), 'error.notInRoom') }
    }
    if (room.hostId !== playerId) {
      return { ok: false, error: translate(room.language, 'error.hostRestart') }
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
      return { ok: false, error: translate(this.languageOf(playerId), 'error.notInRoom') }
    }
    if (room.phase !== 'playing' || !room.round) {
      return {
        ok: false,
        reason: 'round-closed',
        error: describeReason(room.language, 'round-closed'),
      }
    }

    const player = room.players.get(playerId)
    if (!player) {
      return { ok: false, error: translate(room.language, 'error.notInThisRoom') }
    }
    if (player.submitted) {
      return {
        ok: false,
        reason: 'already-submitted',
        error: describeReason(room.language, 'already-submitted'),
      }
    }

    const msLeft = room.round.endsAt - Date.now()
    if (msLeft <= 0) {
      this.endRound(room.code)
      return {
        ok: false,
        reason: 'round-closed',
        error: describeReason(room.language, 'round-closed'),
      }
    }

    const validation = validateWord({
      word: rawWord,
      target: room.round.target,
      usedWords: room.usedWords,
      isDictionaryWord: (word) => this.isWord(room.language, word),
    })

    if (!validation.valid) {
      return {
        ok: false,
        reason: validation.reason ?? undefined,
        error: describeReason(room.language, validation.reason),
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

      const hasHumans = [...room.players.values()].some((player) => !player.isBot)
      if (!hasHumans) {
        this.deleteRoom(room.code)
      } else {
        this.sync(room.code)
        this.maybeEndRound(room)
      }
    }

    this.playerRooms.delete(playerId)
    this.playerSockets.delete(playerId)
    this.playerLanguages.delete(playerId)
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
    const target =
      room.targetQueue[room.roundNumber - 1] ??
      pickTargets(Math.random, 1, room.language)[0] ??
      TARGET_POOLS[room.language][0] ??
      'ar'
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
    this.clearBotTimers(room)
    room.botRush = false
    room.roundTimer = setTimeout(() => this.endRound(room.code), ROUND_DURATION_MS)

    this.sync(room.code)
    this.scheduleBots(room)
  }

  private endRound = (code: string): void => {
    const room = this.rooms.get(code)
    if (!room || room.phase !== 'playing') {
      return
    }

    this.clearRoundTimer(room)
    this.clearBotTimers(room)
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

    const humansPending = connected.some((player) => !player.isBot && !player.submitted)
    if (!humansPending) {
      this.hurryBots(room)
    }

    if (connected.every((player) => player.submitted)) {
      this.endRound(room.code)
    }
  }

  private addBotsToRoom = (room: Room, count: number): number => {
    const requested = Math.floor(count)
    if (!Number.isFinite(requested) || requested <= 0) {
      return 0
    }

    const available = MAX_PLAYERS - room.players.size
    const toAdd = Math.min(requested, available)
    let added = 0

    for (let index = 0; index < toAdd; index += 1) {
      const id = `bot-${room.code}-${room.nextBotNumber}`
      room.nextBotNumber += 1
      room.players.set(id, makePlayer(id, this.nextBotName(room), true))
      room.botSkills.set(id, 0.45 + Math.random() * 0.5)
      this.playerRooms.set(id, room.code)
      added += 1
    }

    return added
  }

  private nextBotName = (room: Room): string => {
    const used = new Set([...room.players.values()].map((player) => player.name))
    const name = BOT_NAMES.find((candidate) => !used.has(candidate))
    if (name) {
      return name
    }

    let suffix = 1
    while (used.has(`Bot ${suffix}`)) {
      suffix += 1
    }
    return `Bot ${suffix}`
  }

  private scheduleBots = (room: Room): void => {
    if (!room.round) {
      return
    }

    const now = Date.now()
    const latestDelay = Math.max(2000, room.round.endsAt - now - 750)

    for (const player of room.players.values()) {
      if (!player.isBot || !player.connected) {
        continue
      }

      const skill = room.botSkills.get(player.id) ?? 0.6
      const baseDelay = 2500 + (1 - skill) * 11_000
      const delay = Math.min(latestDelay, Math.round(baseDelay + Math.random() * 3000))

      this.clearBotTimer(room, player.id)
      const timer = setTimeout(() => {
        room.botTimers.delete(player.id)
        this.botPlay(room, player.id)
      }, delay)
      room.botTimers.set(player.id, timer)
    }
  }

  private hurryBots = (room: Room): void => {
    if (room.botRush) {
      return
    }

    const pending = [...room.players.values()].filter(
      (player) => player.isBot && player.connected && !player.submitted,
    )
    if (pending.length === 0) {
      return
    }

    room.botRush = true
    for (const bot of pending) {
      this.clearBotTimer(room, bot.id)
      const delay = 800 + Math.random() * 2200
      const timer = setTimeout(() => {
        room.botTimers.delete(bot.id)
        this.botPlay(room, bot.id)
      }, delay)
      room.botTimers.set(bot.id, timer)
    }
  }

  private botPlay = (room: Room, botId: string): void => {
    if (room.phase !== 'playing' || !room.round) {
      return
    }

    const bot = room.players.get(botId)
    if (!bot?.isBot || bot.submitted) {
      return
    }

    const word = this.pickBotWord(room.language, room.round.target, room.usedWords)
    if (!word) {
      bot.submitted = true
      this.sync(room.code)
      this.maybeEndRound(room)
      return
    }

    const result = this.submit(botId, word)
    if (!result.ok) {
      bot.submitted = true
      this.sync(room.code)
      this.maybeEndRound(room)
    }
  }

  private reassignHost = (room: Room): void => {
    const host = room.players.get(room.hostId)
    if (host?.connected && !host.isBot) {
      return
    }

    const next = [...room.players.values()].find(
      (player) => player.connected && !player.isBot,
    )
    if (next) {
      room.hostId = next.id
    }
  }

  private scheduleEmptyCleanup = (room: Room): void => {
    const anyConnectedHuman = [...room.players.values()].some(
      (player) => player.connected && !player.isBot,
    )
    if (anyConnectedHuman) {
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
    this.clearBotTimers(room)
    room.players.forEach((_player, id) => {
      this.playerRooms.delete(id)
      this.playerSockets.delete(id)
      this.playerLanguages.delete(id)
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

  private clearBotTimer = (room: Room, botId: string): void => {
    const timer = room.botTimers.get(botId)
    if (timer) {
      clearTimeout(timer)
      room.botTimers.delete(botId)
    }
  }

  private clearBotTimers = (room: Room): void => {
    room.botTimers.forEach((timer) => clearTimeout(timer))
    room.botTimers.clear()
  }

  private roomOf = (playerId: string): Room | undefined => {
    const code = this.playerRooms.get(playerId)
    return code ? this.rooms.get(code) : undefined
  }

  private languageOf = (playerId: string): LanguageCode =>
    this.playerLanguages.get(playerId) ?? DEFAULT_LANGUAGE

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
    language: room.language,
    players: [...room.players.values()]
      .map((player) => ({ ...player, isHost: player.id === room.hostId }))
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)),
    round: room.round,
    roundNumber: room.roundNumber,
    maxRounds: room.maxRounds,
    serverTime: Date.now(),
  })
}
