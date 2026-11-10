import { translate } from './i18n'
import { DEFAULT_LANGUAGE, type LanguageCode } from './languages'
import { BULGARIAN_TARGET_POOL } from './targets-bg'
import type {
  Difficulty,
  GameMode,
  RoomSettings,
  ValidationReason,
} from './types'

export const ROUND_DURATION_MS = 20_000
export const MIN_WORD_LENGTH = 4
export const MAX_WORD_LENGTH = 24
export const DEFAULT_MAX_ROUNDS = 5

export const MIN_ROUNDS = 1
export const MAX_ROUNDS = 10
export const MIN_ROUND_DURATION_MS = 8_000
export const MAX_ROUND_DURATION_MS = 60_000
export const MIN_WORD_LENGTH_SETTING = 3
export const MAX_WORD_LENGTH_SETTING = 8

export const BASE_POINTS = 100
export const PER_LETTER_BONUS = 10
export const MAX_SPEED_BONUS = 50
export const FIRST_BLOOD_BONUS = 50
export const RARE_LETTER_BONUS = 15
export const STREAK_BONUS = 20
export const MAX_STREAK_BONUS_STEPS = 5
export const UNIQUE_LETTER_BONUS = 25
export const LONGEST_WORD_BONUS = 30
export const COMEBACK_BONUS = 20

export const RARE_LETTERS = new Set(['j', 'q', 'x', 'z'])

export const GAME_MODES: readonly GameMode[] = ['classic', 'blitz', 'marathon', 'rush']
export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard']

export const MODE_DURATIONS: Record<GameMode, number> = {
  classic: ROUND_DURATION_MS,
  blitz: 10_000,
  marathon: 60_000,
  rush: 30_000,
}

export const DEFAULT_SETTINGS: RoomSettings = {
  maxRounds: DEFAULT_MAX_ROUNDS,
  roundDurationMs: ROUND_DURATION_MS,
  minWordLength: MIN_WORD_LENGTH,
  difficulty: 'normal',
  mode: 'classic',
}

const DIFFICULTY_LENGTHS: Record<Difficulty, readonly [number, number]> = {
  easy: [2, 2],
  normal: [2, 3],
  hard: [3, 4],
}

export const TARGET_POOL: readonly string[] = [
  'ar',
  'er',
  'in',
  'ou',
  'st',
  'ea',
  'th',
  'he',
  'an',
  'en',
  're',
  'on',
  'at',
  'or',
  'is',
  'it',
  'ed',
  'es',
  'nd',
  'ng',
  'le',
  've',
  'se',
  'ce',
  'te',
  'ne',
  'me',
  'de',
  'be',
  'ge',
  'pe',
  'li',
  'ri',
  'ti',
  'si',
  'di',
  'mi',
  'ni',
  'pi',
  'co',
  'ion',
  'ing',
  'ent',
  'ate',
  'ous',
  'ter',
  'pre',
  'con',
  'ble',
  'ght',
  'str',
  'igh',
  'ear',
  'all',
  'ake',
  'ort',
  'umb',
  'eam',
  'and',
  'the',
  'her',
  'ere',
  'ive',
  'est',
  'ess',
  'ist',
  'ine',
  'ise',
  'ize',
  'ant',
  'per',
  'ver',
  'res',
  'les',
  'ted',
  'tra',
  'tri',
  'rat',
  'lit',
  'cal',
  'men',
  'tor',
  'log',
  'pro',
  'int',
  'ran',
  'min',
  'era',
  'red',
  'sin',
  'ast',
  'mat',
  'ect',
  'mis',
  'sta',
  'ali',
  'ica',
  'tic',
  'dis',
  'ism',
  'ove',
  'ati',
  'tio',
  'ers',
  'ies',
  'tion',
  'ness',
  'ting',
  'ions',
  'ings',
  'able',
  'ical',
  'over',
  'ment',
  'olog',
  'ring',
  'ally',
  'tive',
  'ates',
  'ated',
  'less',
  'late',
  'king',
  'ther',
  'rate',
  'hing',
  'ence',
  'sion',
  'tric',
  'ight',
  'line',
  'ance',
  'vers',
  'form',
  'cate',
  'ture',
  'ound',
  'land',
  'gram',
  'phon',
  'ough',
  'work',
  'port',
  'logy',
  'here',
]

export const TARGET_POOLS: Record<LanguageCode, readonly string[]> = {
  en: TARGET_POOL,
  bg: BULGARIAN_TARGET_POOL,
}

export const normalizeWord = (raw: string): string =>
  raw
    .trim()
    .toLowerCase()
    .replace(/ѝ/g, 'и')
    .replace(/[^\p{L}]/gu, '')

export interface ValidationInput {
  word: string
  target: string
  usedWords: ReadonlySet<string>
  isDictionaryWord: (word: string) => boolean
  minLength?: number
}

export interface ValidationResult {
  valid: boolean
  normalized: string
  reason: ValidationReason | null
}

export const validateWord = ({
  word,
  target,
  usedWords,
  isDictionaryWord,
  minLength = MIN_WORD_LENGTH,
}: ValidationInput): ValidationResult => {
  const normalized = normalizeWord(word)

  if (normalized.length < minLength) {
    return { valid: false, normalized, reason: 'too-short' }
  }

  if (normalized.length > MAX_WORD_LENGTH) {
    return { valid: false, normalized, reason: 'too-long' }
  }

  if (!normalized.includes(target.toLowerCase())) {
    return { valid: false, normalized, reason: 'missing-target' }
  }

  if (!isDictionaryWord(normalized)) {
    return { valid: false, normalized, reason: 'not-a-word' }
  }

  if (usedWords.has(normalized)) {
    return { valid: false, normalized, reason: 'duplicate' }
  }

  return { valid: true, normalized, reason: null }
}

export interface ScoreInput {
  wordLength: number
  msLeft: number
  durationMs: number
  isFirst: boolean
  word?: string
  streak?: number
  isLongest?: boolean
  isComeback?: boolean
}

export interface ScoreBreakdown {
  base: number
  length: number
  speed: number
  first: number
  rare: number
  unique: number
  streak: number
  longest: number
  comeback: number
  total: number
}

const countRareLetters = (word: string): number => {
  let count = 0
  for (const letter of word.toLowerCase()) {
    if (RARE_LETTERS.has(letter)) {
      count += 1
    }
  }
  return count
}

const hasUniqueLetters = (word: string): boolean =>
  new Set(word.toLowerCase()).size === word.length

export const scoreBreakdown = ({
  wordLength,
  msLeft,
  durationMs,
  isFirst,
  word,
  streak = 0,
  isLongest = false,
  isComeback = false,
}: ScoreInput): ScoreBreakdown => {
  const lengthBonus = Math.max(0, wordLength - MIN_WORD_LENGTH) * PER_LETTER_BONUS
  const speedRatio = Math.min(1, Math.max(0, msLeft / durationMs))
  const speedBonus = Math.round(speedRatio * MAX_SPEED_BONUS)
  const firstBonus = isFirst ? FIRST_BLOOD_BONUS : 0
  const rareBonus = word ? countRareLetters(word) * RARE_LETTER_BONUS : 0
  const uniqueBonus = word && wordLength > MIN_WORD_LENGTH && hasUniqueLetters(word)
    ? UNIQUE_LETTER_BONUS
    : 0
  const streakSteps = Math.min(
    MAX_STREAK_BONUS_STEPS,
    Math.max(0, streak - 1),
  )
  const streakBonus = streakSteps * STREAK_BONUS
  const longestBonus = isLongest ? LONGEST_WORD_BONUS : 0
  const comebackBonus = isComeback ? COMEBACK_BONUS : 0

  return {
    base: BASE_POINTS,
    length: lengthBonus,
    speed: speedBonus,
    first: firstBonus,
    rare: rareBonus,
    unique: uniqueBonus,
    streak: streakBonus,
    longest: longestBonus,
    comeback: comebackBonus,
    total:
      BASE_POINTS +
      lengthBonus +
      speedBonus +
      firstBonus +
      rareBonus +
      uniqueBonus +
      streakBonus +
      longestBonus +
      comebackBonus,
  }
}

export const scoreWord = (input: ScoreInput): number => scoreBreakdown(input).total

export const pickTargets = (
  random: () => number,
  count: number,
  language: LanguageCode = DEFAULT_LANGUAGE,
  difficulty: Difficulty = 'normal',
): string[] => {
  const [minLength, maxLength] = DIFFICULTY_LENGTHS[difficulty]
  const all = TARGET_POOLS[language]
  const filtered = all.filter(
    (target) => target.length >= minLength && target.length <= maxLength,
  )
  const pool = [...(filtered.length >= count ? filtered : all)]
  const picked: string[] = []

  for (let i = 0; i < count && pool.length > 0; i += 1) {
    const index = Math.floor(random() * pool.length)
    const [target] = pool.splice(index, 1)
    if (target) {
      picked.push(target)
    }
  }

  return picked
}

const clampNumber = (
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number => {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) {
    return fallback
  }
  return Math.min(max, Math.max(min, Math.round(numeric)))
}

export const clampSettings = (settings: RoomSettings): RoomSettings => ({
  maxRounds: clampNumber(settings.maxRounds, MIN_ROUNDS, MAX_ROUNDS, DEFAULT_SETTINGS.maxRounds),
  roundDurationMs: clampNumber(
    settings.roundDurationMs,
    MIN_ROUND_DURATION_MS,
    MAX_ROUND_DURATION_MS,
    DEFAULT_SETTINGS.roundDurationMs,
  ),
  minWordLength: clampNumber(
    settings.minWordLength,
    MIN_WORD_LENGTH_SETTING,
    MAX_WORD_LENGTH_SETTING,
    DEFAULT_SETTINGS.minWordLength,
  ),
  difficulty: DIFFICULTIES.includes(settings.difficulty) ? settings.difficulty : 'normal',
  mode: GAME_MODES.includes(settings.mode) ? settings.mode : 'classic',
})

export const roundDurationFor = (
  settings: RoomSettings,
  roundNumber: number,
): number => {
  const step = Math.max(0, roundNumber - 1) * 1500
  return Math.max(MIN_ROUND_DURATION_MS, settings.roundDurationMs - step)
}

export const hashString = (value: string): number => {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export const seededRandom = (seed: number): (() => number) => {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

export const dailySeed = (date: Date = new Date()): number => {
  const key = `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()}`
  return hashString(key)
}

export const describeReason = (
  language: LanguageCode,
  reason: ValidationReason | null,
  minLength: number = MIN_WORD_LENGTH,
): string => {
  switch (reason) {
    case 'too-short':
      return translate(language, 'reason.tooShort', { min: minLength })
    case 'too-long':
      return translate(language, 'reason.tooLong', { max: MAX_WORD_LENGTH })
    case 'missing-target':
      return translate(language, 'reason.missingTarget')
    case 'not-a-word':
      return translate(language, 'reason.notAWord')
    case 'duplicate':
      return translate(language, 'reason.duplicate')
    case 'already-submitted':
      return translate(language, 'reason.alreadySubmitted')
    case 'round-closed':
      return translate(language, 'reason.roundClosed')
    case 'spectating':
      return translate(language, 'reason.spectating')
    default:
      return translate(language, 'reason.unknown')
  }
}
