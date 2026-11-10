import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'
import { MAX_WORD_LENGTH, MIN_WORD_LENGTH } from '../shared/game'
import { DEFAULT_LANGUAGE, type LanguageCode } from '../shared/languages'

const require = createRequire(import.meta.url)
const englishWords = require('an-array-of-english-words') as string[]

const BULGARIAN_WORDS_FILE = join(
  dirname(fileURLToPath(import.meta.url)),
  'data/bg-words.txt.gz',
)

interface LanguageData {
  wordSet: Set<string>
  playableWords: string[]
  shortBotWords: string[]
  shortCache: Map<string, string[]>
  longCache: Map<string, string[]>
}

const buildLanguageData = (words: Iterable<string>): LanguageData => {
  const wordSet = new Set<string>()

  for (const raw of words) {
    const word = raw.trim().toLowerCase()
    if (word.length > 0) {
      wordSet.add(word)
    }
  }

  const playableWords = [...wordSet].filter(
    (word) =>
      word.length >= MIN_WORD_LENGTH &&
      word.length <= MAX_WORD_LENGTH &&
      /^\p{L}+$/u.test(word),
  )

  return {
    wordSet,
    playableWords,
    shortBotWords: playableWords.filter((word) => word.length <= 8),
    shortCache: new Map(),
    longCache: new Map(),
  }
}

const loadBulgarianWords = (): string[] =>
  gunzipSync(readFileSync(BULGARIAN_WORDS_FILE)).toString('utf8').split('\n')

const cache = new Map<LanguageCode, LanguageData>()

const dataFor = (language: LanguageCode): LanguageData => {
  const cached = cache.get(language)
  if (cached) {
    return cached
  }

  const data =
    language === 'bg' ? buildLanguageData(loadBulgarianWords()) : buildLanguageData(englishWords)
  cache.set(language, data)
  return data
}

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

export const isDictionaryWord = (language: LanguageCode, word: string): boolean =>
  dataFor(language).wordSet.has(word)

export const pickBotWord = (
  language: LanguageCode,
  target: string,
  usedWords: ReadonlySet<string>,
  minLength: number = MIN_WORD_LENGTH,
  random: () => number = Math.random,
): string | null => {
  const data = dataFor(language)
  const shortMatches = matchesFor(data.shortBotWords, target, data.shortCache)
  let available = shortMatches.filter(
    (word) => word.length >= minLength && !usedWords.has(word),
  )

  if (available.length === 0) {
    const longMatches = matchesFor(data.playableWords, target, data.longCache)
    available = longMatches.filter(
      (word) => word.length >= minLength && !usedWords.has(word),
    )
  }

  if (available.length === 0) {
    return null
  }

  return available[Math.floor(random() * available.length)] ?? null
}

export const dictionarySize = (language: LanguageCode = DEFAULT_LANGUAGE): number =>
  dataFor(language).wordSet.size

export const warmDictionary = (language: LanguageCode): void => {
  dataFor(language)
}
