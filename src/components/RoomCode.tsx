import { useEffect, useState } from 'react'
import styles from './RoomCode.module.scss'

interface RoomCodeProps {
  code: string
}

export const RoomCode = ({ code }: RoomCodeProps) => {
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
    <button className={styles.roomCode} onClick={() => void copy()} title="Copy room code">
      <span className={styles.roomCodeLabel}>Room</span>
      <span className={styles.roomCodeValue}>{code}</span>
      <span className={styles.roomCodeHint}>{copied ? 'copied' : 'copy'}</span>
    </button>
  )
}
