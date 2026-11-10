import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
import { HunspellReader } from 'hunspell-reader'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const AFF_FILE = join(ROOT, 'node_modules/dictionary-bg/index.aff')
const DIC_FILE = join(ROOT, 'node_modules/dictionary-bg/index.dic')
const DATA_DIR = join(ROOT, 'server/data')
const TARGET_FILE = join(ROOT, 'shared/targets-bg.ts')

const MIN_LENGTH = 4
const MAX_LENGTH = 24

const normalize = (raw) => raw.trim().toLowerCase().replace(/ѝ/g, 'и')

const reader = await HunspellReader.createFromFiles(AFF_FILE, DIC_FILE)
const words = new Set()

for (const raw of reader) {
  const word = normalize(raw)
  if (word.length < MIN_LENGTH || word.length > MAX_LENGTH) {
    continue
  }
  if (!/^[а-я]+$/.test(word)) {
    continue
  }
  words.add(word)
}

const sorted = [...words].sort()
const plain = Buffer.from(sorted.join('\n'), 'utf8')
const gzipped = gzipSync(plain, { level: 9 })

mkdirSync(DATA_DIR, { recursive: true })
writeFileSync(join(DATA_DIR, 'bg-words.txt.gz'), gzipped)

const counts = new Map([
  [2, new Map()],
  [3, new Map()],
  [4, new Map()],
])

for (const word of sorted) {
  for (let length = 2; length <= 4; length += 1) {
    const seen = new Set()
    for (let start = 0; start + length <= word.length; start += 1) {
      const substring = word.slice(start, start + length)
      if (seen.has(substring)) {
        continue
      }
      seen.add(substring)
      const bucket = counts.get(length)
      bucket.set(substring, (bucket.get(substring) ?? 0) + 1)
    }
  }
}

const select = (length, limit, minCount) => {
  const bucket = counts.get(length)
  const ranked = [...bucket.entries()]
    .filter(([, count]) => count >= minCount)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'bg'))

  const picked = ranked.slice(0, limit).map(([target]) => target)
  if (picked.length < limit) {
    const extra = ranked.slice(limit).map(([target]) => target)
    picked.push(...extra.slice(0, limit - picked.length))
  }
  return picked
}

const targets = [
  ...select(2, 40, 500),
  ...select(3, 65, 200),
  ...select(4, 40, 100),
]

const uniqueTargets = [...new Set(targets)]

writeFileSync(
  TARGET_FILE,
  `export const BULGARIAN_TARGET_POOL: readonly string[] = ${JSON.stringify(
    uniqueTargets,
    null,
    2,
  )}\n`,
)

console.log(
  JSON.stringify({
    words: sorted.length,
    plainBytes: plain.length,
    gzipBytes: gzipped.length,
    targets: uniqueTargets.length,
    sample: uniqueTargets.slice(0, 12),
  }),
)
