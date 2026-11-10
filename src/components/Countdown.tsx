import { useEffect, useState } from 'react'
import styles from './Countdown.module.scss'

interface CountdownProps {
  endsAt: number
  serverOffset: number
  durationMs: number
}

export const Countdown = ({ endsAt, serverOffset, durationMs }: CountdownProps) => {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 100)
    return () => window.clearInterval(timer)
  }, [])

  const remaining = Math.max(0, endsAt - (now + serverOffset))
  const seconds = Math.ceil(remaining / 1000)
  const ratio = durationMs > 0 ? Math.min(1, remaining / durationMs) : 0
  const urgent = remaining <= 5000

  return (
    <div className={`${styles.countdown} ${urgent ? styles.urgent : ''}`}>
      <span className={styles.countdownValue}>{seconds}s</span>
      <span className={styles.countdownTrack}>
        <span className={styles.countdownFill} style={{ width: `${ratio * 100}%` }} />
      </span>
    </div>
  )
}
