import { useEffect, useState } from 'react'

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
    <button className="room-code" onClick={() => void copy()} title="Copy room code">
      <span className="room-code__label">Room</span>
      <span className="room-code__value">{code}</span>
      <span className="room-code__hint">{copied ? 'copied' : 'copy'}</span>
    </button>
  )
}
