import { createRequire } from 'node:module'
import { MAX_WORD_LENGTH, MIN_WORD_LENGTH } from '../shared/game'

const require = createRequire(import.meta.url)
const words = require('an-array-of-english-words') as string[]

const normalizedWords = [...new Set(words.map((word) => word.toLowerCase()))]
const wordSet: Set<string> = new Set(normalizedWords)
const playableWords = normalizedWords.filter(
  (word) =>
    word.length >= MIN_WORD_LENGTH && word.length <= MAX_WORD_LENGTH && /^[a-z]+$/.test(word),
)
const shortBotWords = playableWords.filter((word) => word.length <= 8)

const shortCache = new Map<string, string[]>()
const longCache = new Map<string, string[]>()

const matchesFor = (
  source: string[],
  target: string,
  cache: Map<string, string[]>,
): string[] => {
  const cached = cache.get(target)
  if (cached) {
    return cached
  }

  const matches = source.filter((word) => word.includes(target))
  cache.set(target, matches)
  return matches
}

export const isDictionaryWord = (word: string): boolean => wordSet.has(word)

export const pickBotWord = (
  target: string,
  usedWords: ReadonlySet<string>,
  random: () => number = Math.random,
): string | null => {
  const shortMatches = matchesFor(shortBotWords, target, shortCache)
  let available = shortMatches.filter((word) => !usedWords.has(word))

  if (available.length === 0) {
    const longMatches = matchesFor(playableWords, target, longCache)
    available = longMatches.filter((word) => !usedWords.has(word))
  }

  if (available.length === 0) {
    return null
  }

  return available[Math.floor(random() * available.length)] ?? null
}

export const dictionarySize = wordSet.size
