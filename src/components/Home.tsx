import { useState, type FormEvent } from 'react'
import { translate, type MessageKey, type MessageVars } from '../../shared/i18n'
import type { LanguageCode } from '../../shared/languages'
import ui from '../styles/ui.module.scss'
import type { ConnectionStatus } from '../connection'
import styles from './Home.module.scss'

interface HomeProps {
  name: string
  language: LanguageCode
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
  language,
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
  const t = (key: MessageKey, vars?: MessageVars) => translate(language, key, vars)

  const handleJoin = (event: FormEvent) => {
    event.preventDefault()
    onJoin(code)
  }

  return (
    <main className={styles.home}>
      <header className={styles.hero}>
        <p className={ui.eyebrow}>{t('home.eyebrow')}</p>
        <h1 className={`${ui.brand} ${styles.brand}`}>
          Word<span>Rush</span>
        </h1>
        <p className={styles.lede}>{t('home.tagline')}</p>
        <div className={styles.heroActions}>
          <button className={`${ui.button} ${ui.buttonGhost}`} onClick={onShowRules}>
            {t('home.rulesButton')}
          </button>
        </div>
      </header>

      <div className={styles.homeGrid}>
        <section className={ui.card}>
          <h2>{t('home.playAs')}</h2>
          <label className={ui.field}>
            <span className={ui.fieldLabel}>{t('home.displayName')}</span>
            <input
              value={name}
              maxLength={16}
              onChange={(event) => onNameChange(event.target.value)}
              placeholder={t('home.namePlaceholder')}
              autoComplete="nickname"
            />
          </label>
          <div className={ui.buttonRow}>
            <button
              className={`${ui.button} ${ui.buttonPrimary}`}
              onClick={onCreate}
              disabled={disabled}
            >
              {t('home.createRoom')}
            </button>
            <button className={ui.button} onClick={onCreateBots} disabled={disabled}>
              {t('home.playBots')}
            </button>
          </div>
          <p className={`${ui.muted} ${ui.small}`}>{t('home.hostNote')}</p>
          <p className={`${ui.muted} ${ui.small}`}>{t('home.languageNote')}</p>
        </section>

        <section className={ui.card}>
          <h2>{t('home.joinRoom')}</h2>
          <form onSubmit={handleJoin}>
            <label className={ui.field}>
              <span className={ui.fieldLabel}>{t('home.roomCode')}</span>
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
              {t('home.join')}
            </button>
          </form>
          <p className={`${ui.muted} ${ui.small}`}>{t('home.askHost')}</p>
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
            ? t('status.connectingServer')
            : t('status.connectionLost')}
        </p>
      )}

      <section className={styles.how}>
        <h2>{t('home.howToPlay')}</h2>
        <ol>
          <li>{t('home.how1')}</li>
          <li>{t('home.how2')}</li>
          <li>{t('home.how3')}</li>
        </ol>
      </section>
    </main>
  )
}
