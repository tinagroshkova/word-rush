import { useState, type FormEvent } from 'react'
import type { ConnectionStatus } from '../connection'

interface HomeProps {
  name: string
  status: ConnectionStatus
  busy: boolean
  error: string | null
  onNameChange: (value: string) => void
  onCreate: () => void
  onJoin: (code: string) => void
}

export const Home = ({
  name,
  status,
  busy,
  error,
  onNameChange,
  onCreate,
  onJoin,
}: HomeProps) => {
  const [code, setCode] = useState('')
  const offline = status !== 'connected'
  const disabled = busy || offline

  const handleJoin = (event: FormEvent) => {
    event.preventDefault()
    onJoin(code)
  }

  return (
    <main className="home">
      <header className="hero">
        <p className="eyebrow">Real-time word battle</p>
        <h1 className="brand">
          Word<span>Rush</span>
        </h1>
        <p className="lede">
          Race the clock and the room. Every answer must contain the target letters.
        </p>
      </header>

      <div className="home__grid">
        <section className="card">
          <h2>Play as</h2>
          <label className="field">
            <span className="field__label">Display name</span>
            <input
              value={name}
              maxLength={16}
              onChange={(event) => onNameChange(event.target.value)}
              placeholder="e.g. Lexi"
              autoComplete="nickname"
            />
          </label>
          <button className="button button--primary" onClick={onCreate} disabled={disabled}>
            Create a room
          </button>
          <p className="muted small">You will be the host and can start the match.</p>
        </section>

        <section className="card">
          <h2>Join a room</h2>
          <form onSubmit={handleJoin}>
            <label className="field">
              <span className="field__label">Room code</span>
              <input
                className="code-input"
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                maxLength={4}
                placeholder="ABCD"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
              />
            </label>
            <button
              className="button"
              type="submit"
              disabled={disabled || code.trim().length === 0}
            >
              Join room
            </button>
          </form>
          <p className="muted small">Ask the host for the 4-letter code.</p>
        </section>
      </div>

      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      {offline && (
        <p className="status status--warn">
          {status === 'connecting'
            ? 'Connecting to the server...'
            : 'Connection lost. Trying to reconnect...'}
        </p>
      )}

      <section className="how">
        <h2>How to play</h2>
        <ol>
          <li>Create a room and share the code, or join a friend&apos;s room.</li>
          <li>Each round reveals a target letter combo. Submit a word that contains it.</li>
          <li>
            Faster, longer and first answers score more. The highest score after five rounds
            wins.
          </li>
        </ol>
      </section>
    </main>
  )
}
