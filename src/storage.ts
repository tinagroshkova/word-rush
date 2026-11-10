import { DEFAULT_LANGUAGE, isLanguageCode, type LanguageCode } from '../shared/languages'

const PLAYER_ID_KEY = 'word-rush:player-id'
const NAME_KEY = 'word-rush:name'
const ROOM_CODE_KEY = 'word-rush:room-code'
const LANGUAGE_KEY = 'word-rush:language'
const THEME_KEY = 'word-rush:theme'

export type Theme = 'dark' | 'light'

export const isTheme = (value: unknown): value is Theme => value === 'dark' || value === 'light'

const read = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

const write = (key: string, value: string | null): void => {
  try {
    if (value === null) {
      window.localStorage.removeItem(key)
    } else {
      window.localStorage.setItem(key, value)
    }
  } catch {
    // storage may be unavailable (private mode, blocked cookies)
  }
}

const createId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

let cachedPlayerId: string | null = null

export const getPlayerId = (): string => {
  if (cachedPlayerId) {
    return cachedPlayerId
  }

  const existing = read(PLAYER_ID_KEY)
  if (existing) {
    cachedPlayerId = existing
    return existing
  }

  const created = createId()
  write(PLAYER_ID_KEY, created)
  cachedPlayerId = created
  return created
}

export const getStoredName = (): string => read(NAME_KEY) ?? ''

export const storeName = (name: string): void => write(NAME_KEY, name)

export const getStoredRoomCode = (): string | null => read(ROOM_CODE_KEY)

export const storeRoomCode = (code: string | null): void => write(ROOM_CODE_KEY, code)

export const getStoredLanguage = (): LanguageCode => {
  const stored = read(LANGUAGE_KEY)
  return isLanguageCode(stored) ? stored : DEFAULT_LANGUAGE
}

export const storeLanguage = (language: LanguageCode): void => write(LANGUAGE_KEY, language)

export const getStoredTheme = (): Theme => {
  const stored = read(THEME_KEY)
  return isTheme(stored) ? stored : 'dark'
}

export const storeTheme = (theme: Theme): void => write(THEME_KEY, theme)
