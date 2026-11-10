import { describe, expect, it } from 'vitest'
import {
  FIRST_BLOOD_BONUS,
  MAX_WORD_LENGTH,
  MIN_WORD_LENGTH,
  pickTargets,
  scoreWord,
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
})
