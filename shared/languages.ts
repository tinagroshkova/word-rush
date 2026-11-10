export type LanguageCode = 'en' | 'bg'

export interface LanguageMeta {
  code: LanguageCode
  label: string
  nativeLabel: string
}

export const LANGUAGES: readonly LanguageMeta[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'bg', label: 'Bulgarian', nativeLabel: 'Български' },
]

export const DEFAULT_LANGUAGE: LanguageCode = 'en'

export const isLanguageCode = (value: unknown): value is LanguageCode =>
  value === 'en' || value === 'bg'
