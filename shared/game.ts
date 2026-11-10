import type { ValidationReason } from './types'

export const ROUND_DURATION_MS = 20_000
export const MIN_WORD_LENGTH = 4
export const MAX_WORD_LENGTH = 24
export const DEFAULT_MAX_ROUNDS = 5

export const BASE_POINTS = 100
export const PER_LETTER_BONUS = 10
export const MAX_SPEED_BONUS = 50
export const FIRST_BLOOD_BONUS = 50

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

export const normalizeWord = (raw: string): string =>
  raw.trim().toLowerCase().replace(/[^a-z]/g, '')

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
}

export const scoreWord = ({
  wordLength,
  msLeft,
  durationMs,
  isFirst,
}: ScoreInput): number => {
  const lengthBonus = Math.max(0, wordLength - MIN_WORD_LENGTH) * PER_LETTER_BONUS
  const speedRatio = Math.min(1, Math.max(0, msLeft / durationMs))
  const speedBonus = Math.round(speedRatio * MAX_SPEED_BONUS)
  const firstBonus = isFirst ? FIRST_BLOOD_BONUS : 0
  return BASE_POINTS + lengthBonus + speedBonus + firstBonus
}

export const pickTargets = (random: () => number, count: number): string[] => {
  const pool = [...TARGET_POOL]
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

export const describeReason = (reason: ValidationReason | null): string => {
  switch (reason) {
    case 'too-short':
      return `Words need at least ${MIN_WORD_LENGTH} letters`
    case 'too-long':
      return `Words can be at most ${MAX_WORD_LENGTH} letters`
    case 'missing-target':
      return 'Your word must contain the target letters'
    case 'not-a-word':
      return 'That is not a word we recognise'
    case 'duplicate':
      return 'Someone already used that word'
    case 'already-submitted':
      return 'You already locked in a word this round'
    case 'round-closed':
      return 'This round is already over'
    default:
      return 'Something went wrong'
  }
}
