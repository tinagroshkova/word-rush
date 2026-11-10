import { useState, type FormEvent } from 'react'
import ui from '../styles/ui.module.scss'
import type { ConnectionStatus } from '../connection'
import styles from './Home.module.scss'

interface HomeProps {
  name: string
  status: ConnectionStatus
  busy: boolean
  error: string | null
  onNameChange: (value: string) => void
  onCreate: () => void
  onCreateBots: () => void
  onJoin: (code: string) => void
  onShowRules: () => void
}

export const Home = ({
  name,
  status,
  busy,
  error,
  onNameChange,
  onCreate,
  onCreateBots,
  onJoin,
  onShowRules,
}: HomeProps) => {
  const [code, setCode] = useState('')
  const offline = status !== 'connected'
  const disabled = busy || offline

  const handleJoin = (event: FormEvent) => {
    event.preventDefault()
    onJoin(code)
  }

  return (
    <main className={styles.home}>
      <header className={styles.hero}>
        <p className={ui.eyebrow}>Real-time word battle</p>
        <h1 className={`${ui.brand} ${styles.brand}`}>
          Word<span>Rush</span>
        </h1>
        <p className={styles.lede}>
          Race the clock and the room. Every answer must contain the target
          letters.
        </p>
        <div className={styles.heroActions}>
          <button className={`${ui.button} ${ui.buttonGhost}`} onClick={onShowRules}>
            Rules &amp; scoring
          </button>
        </div>
      </header>

      <div className={styles.homeGrid}>
        <section className={ui.card}>
          <h2>Play as</h2>
          <label className={ui.field}>
            <span className={ui.fieldLabel}>Display name</span>
            <input
              value={name}
              maxLength={16}
              onChange={(event) => onNameChange(event.target.value)}
              placeholder="e.g. Lexi"
              autoComplete="nickname"
            />
          </label>
          <div className={ui.buttonRow}>
            <button
              className={`${ui.button} ${ui.buttonPrimary}`}
              onClick={onCreate}
              disabled={disabled}
            >
              Create a room
            </button>
            <button className={ui.button} onClick={onCreateBots} disabled={disabled}>
              Play vs bots
            </button>
          </div>
          <p className={`${ui.muted} ${ui.small}`}>
            You will be the host. Play vs bots fills three seats instantly.
          </p>
        </section>

        <section className={ui.card}>
          <h2>Join a room</h2>
          <form onSubmit={handleJoin}>
            <label className={ui.field}>
              <span className={ui.fieldLabel}>Room code</span>
              <input
                className={styles.codeInput}
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
              className={ui.button}
              type="submit"
              disabled={disabled || code.trim().length === 0}
            >
              Join room
            </button>
          </form>
          <p className={`${ui.muted} ${ui.small}`}>Ask the host for the 4-letter code.</p>
        </section>
      </div>

      {error && (
        <p className={ui.alert} role="alert">
          {error}
        </p>
      )}

      {offline && (
        <p className={`${ui.status} ${ui.statusWarn}`}>
          {status === 'connecting'
            ? 'Connecting to the server...'
            : 'Connection lost. Trying to reconnect...'}
        </p>
      )}

      <section className={styles.how}>
        <h2>How to play</h2>
        <ol>
          <li>
            Create a room and share the code, or join a friend&apos;s room.
          </li>
          <li>
            Each round reveals a target letter combo. Submit a word that
            contains it.
          </li>
          <li>
            Faster, longer and first answers score more. The highest score after
            five rounds wins.
          </li>
        </ol>
      </section>
    </main>
  )
}
