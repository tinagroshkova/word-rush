import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const words = require('an-array-of-english-words') as string[]

const wordSet: Set<string> = new Set(words.map((word) => word.toLowerCase()))

export const isDictionaryWord = (word: string): boolean => wordSet.has(word)

export const dictionarySize = wordSet.size
