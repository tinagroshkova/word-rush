import { useEffect, useState } from 'react'
import { translate } from '../../shared/i18n'
import type { LanguageCode } from '../../shared/languages'
import styles from './RoomCode.module.scss'

interface RoomCodeProps {
  code: string
  language: LanguageCode
}

export const RoomCode = ({ code, language }: RoomCodeProps) => {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) {
      return
    }

    const timer = window.setTimeout(() => setCopied(false), 1600)
    return () => window.clearTimeout(timer)
  }, [copied])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <button
      className={styles.roomCode}
      onClick={() => void copy()}
      title={translate(language, 'common.copyCode')}
    >
      <span className={styles.roomCodeLabel}>{translate(language, 'common.room')}</span>
      <span className={styles.roomCodeValue}>{code}</span>
      <span className={styles.roomCodeHint}>
        {copied ? translate(language, 'common.copied') : translate(language, 'common.copy')}
      </span>
    </button>
  )
}
