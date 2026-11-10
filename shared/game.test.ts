import { describe, expect, it } from 'vitest'
import {
  COMEBACK_BONUS,
  DEFAULT_SETTINGS,
  FIRST_BLOOD_BONUS,
  LONGEST_WORD_BONUS,
  MAX_ROUNDS,
  MAX_WORD_LENGTH,
  MIN_ROUNDS,
  MIN_WORD_LENGTH,
  RARE_LETTER_BONUS,
  STREAK_BONUS,
  TARGET_POOL,
  clampSettings,
  dailySeed,
  pickTargets,
  scoreBreakdown,
  scoreWord,
  seededRandom,
  validateWord,
} from './game'

const dictionary = new Set(['star', 'stare', 'target', 'argon', 'cargo', 'zzzz'])

const isWord = (word: string): boolean => dictionary.has(word)

const validate = (word: string, target: string, used: string[] = []) =>
  validateWord({
    word,
    target,
    usedWords: new Set(used),
    isDictionaryWord: isWord,
  })

describe('normalizeWord via validateWord', () => {
  it('strips punctuation and casing', () => {
    const result = validate('  StAr!! ', 'ar')
    expect(result.normalized).toBe('star')
    expect(result.valid).toBe(true)
  })
})

describe('validateWord', () => {
  it('rejects words that are too short', () => {
    expect(validate('arc', 'ar').reason).toBe('too-short')
  })

  it('rejects words that are too long', () => {
    expect(validate('a'.repeat(MAX_WORD_LENGTH + 1), 'a').reason).toBe('too-long')
  })

  it('rejects words missing the target', () => {
    expect(validate('cargo', 'st').reason).toBe('missing-target')
  })

  it('rejects words not in the dictionary', () => {
    expect(validate('stxyz', 'st').reason).toBe('not-a-word')
  })

  it('rejects duplicate words already used', () => {
    expect(validate('star', 'ar', ['star']).reason).toBe('duplicate')
  })

  it('accepts a valid word containing the target', () => {
    const result = validate('argon', 'ar')
    expect(result.valid).toBe(true)
    expect(result.reason).toBeNull()
  })

  it('honours a custom minimum length', () => {
    const result = validateWord({
      word: 'arc',
      target: 'ar',
      usedWords: new Set(),
      isDictionaryWord: () => true,
      minLength: 3,
    })
    expect(result.valid).toBe(true)
  })
})

describe('scoreWord', () => {
  it('awards first blood only to the first submitter', () => {
    const first = scoreWord({ wordLength: MIN_WORD_LENGTH, msLeft: 0, durationMs: 1000, isFirst: true })
    const second = scoreWord({ wordLength: MIN_WORD_LENGTH, msLeft: 0, durationMs: 1000, isFirst: false })
    expect(first - second).toBe(FIRST_BLOOD_BONUS)
  })

  it('rewards longer words and faster answers', () => {
    const slowShort = scoreWord({ wordLength: MIN_WORD_LENGTH, msLeft: 0, durationMs: 1000, isFirst: false })
    const fastLong = scoreWord({ wordLength: MIN_WORD_LENGTH + 3, msLeft: 1000, durationMs: 1000, isFirst: false })
    expect(fastLong).toBeGreaterThan(slowShort)
  })

  it('never returns negative speed bonus for late submissions', () => {
    const late = scoreWord({ wordLength: MIN_WORD_LENGTH, msLeft: -5000, durationMs: 1000, isFirst: false })
    const zero = scoreWord({ wordLength: MIN_WORD_LENGTH, msLeft: 0, durationMs: 1000, isFirst: false })
    expect(late).toBe(zero)
  })
})

describe('pickTargets', () => {
  it('has a large, unique set of lowercase targets', () => {
    expect(TARGET_POOL.length).toBeGreaterThanOrEqual(100)
    expect(new Set(TARGET_POOL).size).toBe(TARGET_POOL.length)
    expect(TARGET_POOL.every((target) => /^[a-z]{2,4}$/.test(target))).toBe(true)
  })

  it('returns the requested number of unique targets', () => {
    const targets = pickTargets(() => 0, 5)
    expect(targets).toHaveLength(5)
    expect(new Set(targets).size).toBe(5)
  })

  it('never returns more targets than the pool holds', () => {
    const targets = pickTargets(() => 0.5, 10_000)
    expect(new Set(targets).size).toBe(targets.length)
    expect(targets.length).toBeLessThan(10_000)
  })

  it('filters targets by difficulty length', () => {
    const hard = pickTargets(() => 0, 5, 'en', 'hard')
    expect(hard.every((target) => target.length >= 3 && target.length <= 4)).toBe(true)
  })
})

describe('bonuses', () => {
  it('rewards rare letters', () => {
    const breakdown = scoreBreakdown({
      wordLength: 5,
      msLeft: 0,
      durationMs: 1000,
      isFirst: false,
      word: 'zebra',
    })
    expect(breakdown.rare).toBe(RARE_LETTER_BONUS)
  })

  it('scales the streak bonus and caps it', () => {
    const two = scoreBreakdown({
      wordLength: MIN_WORD_LENGTH,
      msLeft: 0,
      durationMs: 1000,
      isFirst: false,
      streak: 2,
    })
    const six = scoreBreakdown({
      wordLength: MIN_WORD_LENGTH,
      msLeft: 0,
      durationMs: 1000,
      isFirst: false,
      streak: 6,
    })
    expect(two.streak).toBe(STREAK_BONUS)
    expect(six.streak).toBe(STREAK_BONUS * 5)
  })

  it('adds longest word and comeback bonuses', () => {
    const breakdown = scoreBreakdown({
      wordLength: MIN_WORD_LENGTH,
      msLeft: 0,
      durationMs: 1000,
      isFirst: false,
      isLongest: true,
      isComeback: true,
    })
    expect(breakdown.longest).toBe(LONGEST_WORD_BONUS)
    expect(breakdown.comeback).toBe(COMEBACK_BONUS)
  })
})

describe('settings and randomness', () => {
  it('clamps out-of-range settings', () => {
    const clamped = clampSettings({
      maxRounds: MAX_ROUNDS + 10,
      roundDurationMs: 1,
      minWordLength: 99,
      difficulty: 'normal',
      mode: 'classic',
    })
    expect(clamped.maxRounds).toBe(MAX_ROUNDS)
    expect(clamped.minWordLength).toBeLessThan(99)
    expect(clamped.roundDurationMs).toBeGreaterThan(1)
  })

  it('keeps valid settings unchanged', () => {
    expect(clampSettings(DEFAULT_SETTINGS)).toEqual(DEFAULT_SETTINGS)
    expect(clampSettings({ ...DEFAULT_SETTINGS, maxRounds: MIN_ROUNDS }).maxRounds).toBe(
      MIN_ROUNDS,
    )
  })

  it('produces deterministic seeded sequences', () => {
    const a = seededRandom(42)
    const b = seededRandom(42)
    const first = Array.from({ length: 5 }, () => a())
    const second = Array.from({ length: 5 }, () => b())
    expect(first).toEqual(second)
  })

  it('keeps the daily seed stable within a day', () => {
    const morning = dailySeed(new Date('2026-05-01T08:00:00Z'))
    const evening = dailySeed(new Date('2026-05-01T22:00:00Z'))
    const nextDay = dailySeed(new Date('2026-05-02T08:00:00Z'))
    expect(morning).toBe(evening)
    expect(morning).not.toBe(nextDay)
  })
})
