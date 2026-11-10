import type {
  ActionResult,
  EmoteEvent,
  PowerUpResult,
  SubmitResult,
} from '../shared/events'
import {
  DEFAULT_SETTINGS,
  TARGET_POOLS,
  clampSettings,
  dailySeed,
  describeReason,
  pickTargets,
  roundDurationFor,
  scoreWord,
  seededRandom,
  validateWord,
} from '../shared/game'
import { translate } from '../shared/i18n'
import { DEFAULT_LANGUAGE, type LanguageCode } from '../shared/languages'
import type {
  BotPersonality,
  GamePhase,
  Player,
  PowerUpType,
  RoomSettings,
  RoomState,
  RoundState,
} from '../shared/types'

interface Room {
  code: string
  hostId: string
  language: LanguageCode
  phase: GamePhase
  players: Map<string, Player>
  round: RoundState | null
  roundNumber: number
  settings: RoomSettings
  daily: boolean
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
export type EmoteBroadcast = (code: string, event: EmoteEvent) => void
export type WordChecker = (language: LanguageCode, word: string) => boolean
export type BotWordPicker = (
  language: LanguageCode,
  target: string,
  usedWords: ReadonlySet<string>,
  minLength?: number,
) => string | null

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 4
const EMPTY_ROOM_TTL_MS = 5 * 60_000
const MAX_PLAYERS = 12
const MAX_NAME_LENGTH = 16
const BOT_FILL_COUNT = 3
const EXTRA_TIME_MS = 5_000
const HINT_AFTER_MISSES = 2
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
const BOT_PERSONALITIES: readonly BotPersonality[] = ['speedster', 'scholar', 'steady']
const POWER_UPS: readonly PowerUpType[] = ['double', 'hint', 'extraTime']

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
  streak: 0,
  bestStreak: 0,
  misses: 0,
  powerUp: null,
  powerUpUsed: false,
  doubleNext: false,
  spectator: false,
})

const pickRandom = <T>(items: readonly T[]): T | undefined =>
  items[Math.floor(Math.random() * items.length)]

export class RoomStore {
  private rooms: Map<string, Room> = new Map()
  private playerRooms: Map<string, string> = new Map()
  private playerSockets: Map<string, string> = new Map()
  private playerLanguages: Map<string, LanguageCode> = new Map()
  private broadcast: Broadcast
  private emoteBroadcast?: EmoteBroadcast
  private isWord: WordChecker
  private pickBotWord: BotWordPicker

  constructor(
    broadcast: Broadcast,
    isWord: WordChecker,
    pickBotWord: BotWordPicker = () => null,
    emoteBroadcast?: EmoteBroadcast,
  ) {
    this.broadcast = broadcast
    this.isWord = isWord
    this.pickBotWord = pickBotWord
    this.emoteBroadcast = emoteBroadcast
  }

  createRoom = (
    playerId: string,
    name: string,
    socketId: string,
    language: LanguageCode = DEFAULT_LANGUAGE,
    daily = false,
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
      settings: { ...DEFAULT_SETTINGS },
      daily,
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

    if (room.players.size >= MAX_PLAYERS) {
      return { ok: false, error: translate(room.language, 'error.roomFull') }
    }

    const current = this.playerRooms.get(playerId)
    if (current && current !== code) {
      this.leaveRoom(playerId)
    }

    if (room.phase === 'playing') {
      const bot = [...room.players.values()].find((player) => player.isBot)
      if (bot) {
        const takeover = makePlayer(playerId, name)
        takeover.score = bot.score
        takeover.streak = bot.streak
        takeover.bestStreak = bot.bestStreak
        takeover.submitted = bot.submitted
        room.players.delete(bot.id)
        room.players.set(playerId, takeover)
        room.botSkills.delete(bot.id)
        this.clearBotTimer(room, bot.id)
        this.playerRooms.delete(bot.id)
        this.playerSockets.delete(bot.id)
        this.playerLanguages.delete(bot.id)
        this.clearEmptyTimer(room)
        this.playerRooms.set(playerId, code)
        this.playerSockets.set(playerId, socketId)
        this.playerLanguages.set(playerId, room.language)
        this.reassignHost(room)
        this.sync(room.code)
        return { ok: true, code }
      }

      const spectator = makePlayer(playerId, name)
      spectator.spectator = true
      room.players.set(playerId, spectator)
      this.clearEmptyTimer(room)
      this.playerRooms.set(playerId, code)
      this.playerSockets.set(playerId, socketId)
      this.playerLanguages.set(playerId, room.language)
      this.reassignHost(room)
      this.sync(room.code)
      return { ok: true, code }
    }

    room.players.set(playerId, makePlayer(playerId, name))
    this.clearEmptyTimer(room)
    this.playerRooms.set(playerId, code)
    this.playerSockets.set(playerId, socketId)
    this.playerLanguages.set(playerId, room.language)

    return { ok: true, code }
  }

  updateSettings = (playerId: string, patch: Partial<RoomSettings>): ActionResult => {
    const room = this.roomOf(playerId)
    if (!room) {
      return { ok: false, error: translate(this.languageOf(playerId), 'error.notInRoom') }
    }
    if (room.hostId !== playerId) {
      return { ok: false, error: translate(room.language, 'error.hostSettings') }
    }
    if (room.phase !== 'lobby') {
      return { ok: false, error: translate(room.language, 'error.settingsLobby') }
    }

    room.settings = clampSettings({ ...room.settings, ...patch })
    this.sync(room.code)
    return { ok: true }
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

  sendEmote = (playerId: string, emoji: string): void => {
    const room = this.roomOf(playerId)
    const player = room?.players.get(playerId)
    if (!room || !player) {
      return
    }

    const safe = emoji.trim().slice(0, 8)
    if (!safe) {
      return
    }

    this.emoteBroadcast?.(room.code, {
      playerId,
      playerName: player.name,
      emoji: safe,
      at: Date.now(),
    })
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
      (player) => player.id !== playerId && !player.isBot && !player.spectator && player.connected,
    )
    const hasBots = [...room.players.values()].some((player) => player.isBot)
    if (!hasOtherHumans && !hasBots) {
      this.addBotsToRoom(room, BOT_FILL_COUNT)
    }

    room.roundNumber = 0
    room.usedWords.clear()
    const random = room.daily ? seededRandom(dailySeed()) : Math.random
    room.targetQueue = pickTargets(
      random,
      room.settings.maxRounds,
      room.language,
      room.settings.difficulty,
    )
    room.players.forEach((player) => {
      player.score = 0
      player.submitted = false
      player.streak = 0
      player.bestStreak = 0
      player.misses = 0
      player.doubleNext = false
      player.powerUpUsed = false
      player.powerUp = player.spectator ? null : (pickRandom(POWER_UPS) ?? 'double')
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
      player.streak = 0
      player.bestStreak = 0
      player.misses = 0
      player.doubleNext = false
      player.powerUp = null
      player.powerUpUsed = false
      player.spectator = false
    })

    this.sync(room.code)
    return { ok: true }
  }

  usePowerUp = (playerId: string, type: PowerUpType): PowerUpResult => {
    const room = this.roomOf(playerId)
    if (!room) {
      return { ok: false, error: translate(this.languageOf(playerId), 'error.notInRoom') }
    }
    if (room.phase !== 'playing' || !room.round) {
      return { ok: false, error: translate(room.language, 'powerup.wrongPhase') }
    }

    const player = room.players.get(playerId)
    if (!player) {
      return { ok: false, error: translate(room.language, 'error.notInThisRoom') }
    }
    if (player.spectator) {
      return { ok: false, error: translate(room.language, 'powerup.spectator') }
    }
    if (player.powerUpUsed || player.powerUp !== type) {
      return { ok: false, error: translate(room.language, 'powerup.alreadyUsed') }
    }

    player.powerUpUsed = true

    switch (type) {
      case 'double':
        player.doubleNext = true
        this.sync(room.code)
        return { ok: true, message: translate(room.language, 'powerup.doubleActive') }
      case 'extraTime': {
        const now = Date.now()
        const remaining = Math.max(0, room.round.endsAt - now)
        room.round.endsAt = now + remaining + EXTRA_TIME_MS
        room.round.durationMs += EXTRA_TIME_MS
        this.clearRoundTimer(room)
        room.roundTimer = setTimeout(
          () => this.endRound(room.code),
          remaining + EXTRA_TIME_MS,
        )
        this.sync(room.code)
        return { ok: true, message: translate(room.language, 'powerup.extraTime') }
      }
      case 'hint': {
        const word = this.pickBotWord(
          room.language,
          room.round.target,
          room.usedWords,
          room.round.minWordLength,
        )
        this.sync(room.code)
        if (!word) {
          return { ok: false, error: translate(room.language, 'powerup.unavailable') }
        }
        return {
          ok: true,
          hint: translate(room.language, 'powerup.hint', { word }),
        }
      }
      default:
        return { ok: false, error: translate(room.language, 'powerup.unavailable') }
    }
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
    if (player.spectator) {
      return {
        ok: false,
        reason: 'spectating',
        error: describeReason(room.language, 'spectating'),
      }
    }

    const isRush = room.settings.mode === 'rush'
    if (!isRush && player.submitted) {
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
      minLength: room.round.minWordLength,
    })

    if (!validation.valid) {
      player.misses += 1
      let hint: string | undefined
      if (player.misses >= HINT_AFTER_MISSES) {
        const suggestion = this.pickBotWord(
          room.language,
          room.round.target,
          room.usedWords,
          room.round.minWordLength,
        )
        if (suggestion) {
          hint = translate(room.language, 'powerup.hint', { word: suggestion })
        }
      }

      return {
        ok: false,
        reason: validation.reason ?? undefined,
        error: describeReason(room.language, validation.reason, room.round.minWordLength),
        hint,
      }
    }

    const isFirst = room.round.submissions.length === 0
    const isLongest = room.round.submissions.every(
      (submission) => submission.word.length <= validation.normalized.length,
    )
    const contenders = [...room.players.values()].filter(
      (candidate) => !candidate.spectator && candidate.connected,
    )
    const sorted = [...contenders].sort((a, b) => a.score - b.score)
    const lowest = sorted[0]
    const highest = sorted[sorted.length - 1]
    const isComeback =
      contenders.length > 1 &&
      lowest?.id === playerId &&
      highest !== undefined &&
      highest.score > lowest.score

    const streak = player.streak + 1
    const multiplier = player.doubleNext ? 2 : 1
    const points =
      scoreWord({
        wordLength: validation.normalized.length,
        msLeft,
        durationMs: room.round.durationMs,
        isFirst,
        word: validation.normalized,
        streak,
        isLongest,
        isComeback,
      }) * multiplier

    player.doubleNext = false
    player.misses = 0
    player.streak = streak
    player.bestStreak = Math.max(player.bestStreak, streak)
    player.submitted = true
    player.score += points
    room.round.submissions.push({
      playerId,
      playerName: player.name,
      word: validation.normalized,
      points,
      at: Date.now(),
      streak,
      multiplier,
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
        streak,
        multiplier,
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
      pickTargets(
        Math.random,
        1,
        room.language,
        room.settings.difficulty,
      )[0] ??
      TARGET_POOLS[room.language][0] ??
      'ar'
    const now = Date.now()
    const durationMs = roundDurationFor(room.settings, room.roundNumber)

    room.players.forEach((player) => {
      player.submitted = false
    })

    room.round = {
      index: room.roundNumber,
      target,
      startedAt: now,
      endsAt: now + durationMs,
      durationMs,
      submissions: [],
      winnerId: null,
      mode: room.settings.mode,
      minWordLength: room.settings.minWordLength,
    }
    room.phase = 'playing'

    this.clearRoundTimer(room)
    this.clearBotTimers(room)
    room.botRush = false
    room.roundTimer = setTimeout(() => this.endRound(room.code), durationMs)

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
    room.phase =
      room.roundNumber >= room.settings.maxRounds ? 'finished' : 'reveal'
    this.sync(code)
  }

  private maybeEndRound = (room: Room): void => {
    if (room.phase !== 'playing') {
      return
    }

    const connected = [...room.players.values()].filter(
      (player) => player.connected && !player.spectator,
    )
    if (connected.length === 0) {
      return
    }

    if (room.settings.mode === 'rush') {
      return
    }

    const humansPending = connected.some(
      (player) => !player.isBot && !player.submitted,
    )
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
      const personality = pickRandom(BOT_PERSONALITIES) ?? 'steady'
      const player = makePlayer(id, this.nextBotName(room), true)
      player.personality = personality
      room.players.set(id, player)
      const base =
        personality === 'speedster' ? 0.78 : personality === 'scholar' ? 0.5 : 0.62
      room.botSkills.set(id, base + Math.random() * 0.2)
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
      const speedFactor =
        player.personality === 'speedster'
          ? 0.55
          : player.personality === 'scholar'
            ? 1.25
            : 1
      const baseDelay = (2500 + (1 - skill) * 11_000) * speedFactor
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

  private scheduleBotPlay = (room: Room, botId: string, delay: number): void => {
    if (room.phase !== 'playing' || !room.round) {
      return
    }

    const remaining = room.round.endsAt - Date.now()
    if (remaining <= 700) {
      return
    }

    const wait = Math.max(250, Math.min(delay, remaining - 500))
    this.clearBotTimer(room, botId)
    const timer = setTimeout(() => {
      room.botTimers.delete(botId)
      this.botPlay(room, botId)
    }, wait)
    room.botTimers.set(botId, timer)
  }

  private botPlay = (room: Room, botId: string): void => {
    if (room.phase !== 'playing' || !room.round) {
      return
    }

    const bot = room.players.get(botId)
    const isRush = room.settings.mode === 'rush'
    if (!bot?.isBot || (bot.submitted && !isRush)) {
      return
    }

    const word = this.pickBotWord(
      room.language,
      room.round.target,
      room.usedWords,
      room.round.minWordLength,
    )
    if (!word) {
      bot.submitted = true
      this.sync(room.code)
      this.maybeEndRound(room)
      return
    }

    const result = this.submit(botId, word)
    if (!result.ok) {
      if (isRush && result.reason === 'duplicate') {
        this.scheduleBotPlay(room, botId, 900 + Math.random() * 1600)
        return
      }

      bot.submitted = true
      this.sync(room.code)
      this.maybeEndRound(room)
      return
    }

    if (isRush && room.phase === 'playing') {
      const skill = room.botSkills.get(bot.id) ?? 0.6
      const speedFactor =
        bot.personality === 'speedster'
          ? 0.55
          : bot.personality === 'scholar'
            ? 1.25
            : 1
      const baseDelay = (1500 + (1 - skill) * 3500) * speedFactor
      this.scheduleBotPlay(room, bot.id, Math.round(baseDelay + Math.random() * 2200))
    }
  }

  private reassignHost = (room: Room): void => {
    const host = room.players.get(room.hostId)
    if (host?.connected && !host.isBot && !host.spectator) {
      return
    }

    const next = [...room.players.values()].find(
      (player) => player.connected && !player.isBot && !player.spectator,
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
    maxRounds: room.settings.maxRounds,
    settings: room.settings,
    daily: room.daily,
    serverTime: Date.now(),
  })
}
