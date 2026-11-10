import { useEffect, useState } from 'react'

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
    <div className={`countdown ${urgent ? 'countdown--urgent' : ''}`}>
      <span className="countdown__value">{seconds}s</span>
      <span className="countdown__track">
        <span className="countdown__fill" style={{ width: `${ratio * 100}%` }} />
      </span>
    </div>
  )
}
