import { useEffect, useState, type FormEvent } from 'react'
import type { PowerUpResult, SubmitResult } from '../../shared/events'
import { describeReason, MAX_WORD_LENGTH } from '../../shared/game'
import { translate, type MessageKey, type MessageVars } from '../../shared/i18n'
import type { LanguageCode } from '../../shared/languages'
import type { PowerUpType, RoomState } from '../../shared/types'
import ui from '../styles/ui.module.scss'
import { Countdown } from './Countdown'
import { PlayerList } from './PlayerList'
import styles from './PlayingRound.module.scss'

interface PlayingRoundProps {
  room: RoomState
  language: LanguageCode
  playerId: string
  serverOffset: number
  onSubmit: (word: string) => Promise<SubmitResult>
  onUsePowerUp: (type: PowerUpType) => Promise<PowerUpResult>
  onWordAccepted: (word: string, points: number, streak: number) => void
}

type Feedback = { tone: 'ok' | 'bad'; text: string }

export const PlayingRound = ({
  room,
  language,
  playerId,
  serverOffset,
  onSubmit,
  onUsePowerUp,
  onWordAccepted,
}: PlayingRoundProps) => {
  const round = room.round
  const me = room.players.find((player) => player.id === playerId)
  const [word, setWord] = useState('')
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [powerBusy, setPowerBusy] = useState(false)
  const t = (key: MessageKey, vars?: MessageVars) => translate(language, key, vars)

  useEffect(() => {
    setWord('')
    setFeedback(null)
  }, [round?.index])

  if (!round) {
    return null
  }

  const isRush = round.mode === 'rush'
  const spectator = me?.spectator ?? false
  const locked = (me?.submitted ?? false) && !isRush
  const submissions = [...round.submissions].sort((a, b) => a.at - b.at)
  const powerUp = me?.powerUp ?? null
  const powerUpUsed = me?.powerUpUsed ?? false

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    if (locked || submitting || spectator) {
      return
    }

    const value = word.trim()
    if (value.length === 0) {
      return
    }

    setSubmitting(true)
    const result = await onSubmit(value)
    setSubmitting(false)

    if (result.ok && result.outcome) {
      setWord('')
      const streak = result.outcome.streak
      setFeedback({
        tone: 'ok',
        text:
          streak > 1
            ? t('play.acceptedStreak', {
                word: result.outcome.word,
                points: result.outcome.points,
                streak,
              })
            : t('play.accepted', {
                word: result.outcome.word,
                points: result.outcome.points,
              }),
      })
      onWordAccepted(result.outcome.word, result.outcome.points, streak)
    } else {
      setFeedback({
        tone: 'bad',
        text: result.hint
          ? result.hint
          : result.reason
            ? describeReason(language, result.reason, round.minWordLength)
            : result.error ?? t('play.didNotCount'),
      })
    }
  }

  const handlePowerUp = async () => {
    if (!powerUp || powerUpUsed || powerBusy) {
      return
    }

    setPowerBusy(true)
    const result = await onUsePowerUp(powerUp)
    setPowerBusy(false)

    if (result.ok) {
      setFeedback({
        tone: 'ok',
        text: result.hint ?? result.message ?? t('powerup.doubleActive'),
      })
    } else {
      setFeedback({
        tone: 'bad',
        text: result.error ?? t('powerup.unavailable'),
      })
    }
  }

  const powerLabel = powerUp ? t(`play.powerup.${powerUp}` as MessageKey) : ''
  const powerDesc = powerUp ? t(`play.powerup.${powerUp}Desc` as MessageKey) : ''

  return (
    <main className={`${ui.layout} ${ui.layoutGame}`}>
      <section className={`${ui.card} ${ui.cardWide} ${styles.game}`}>
        <div className={styles.gameTop}>
          <span className={ui.pill}>
            {t('play.round', { index: round.index, total: room.maxRounds })}
          </span>
          <div className={styles.badges}>
            <span className={`${ui.pill} ${styles.modePill}`}>
              {t(`mode.${round.mode}` as MessageKey)}
            </span>
            {me && me.streak > 1 && (
              <span className={`${ui.pill} ${styles.streakPill}`}>
                {t('play.streak', { count: me.streak })}
              </span>
            )}
            {me?.doubleNext && (
              <span className={`${ui.pill} ${styles.doublePill}`}>
                ×2 {t('play.powerup.double')}
              </span>
            )}
          </div>
          <Countdown
            endsAt={round.endsAt}
            serverOffset={serverOffset}
            durationMs={round.durationMs}
          />
        </div>

        <div className={ui.target}>
          <p className={ui.targetLabel}>{t('play.mustContain')}</p>
          <p className={ui.targetLetters}>{round.target.toUpperCase()}</p>
        </div>

        {spectator ? (
          <div className={styles.locked}>
            <p className={styles.lockedTitle}>{t('play.spectating')}</p>
            <p className={ui.muted}>{t('play.spectatingNote')}</p>
          </div>
        ) : locked ? (
          <div className={styles.locked}>
            <p className={styles.lockedTitle}>{t('play.lockedIn')}</p>
            <p className={ui.muted}>{t('play.lockedNote')}</p>
          </div>
        ) : (
          <form className={styles.wordForm} onSubmit={handleSubmit}>
            <label className={`${ui.field} ${styles.wordField}`}>
              <span className={ui.fieldLabel}>{t('play.yourWord')}</span>
              <input
                value={word}
                onChange={(event) => setWord(event.target.value.toLowerCase())}
                placeholder={t('play.placeholder', {
                  target: round.target,
                  min: round.minWordLength,
                })}
                maxLength={MAX_WORD_LENGTH}
                autoFocus
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                disabled={submitting}
              />
            </label>
            <button
              className={`${ui.button} ${ui.buttonPrimary}`}
              type="submit"
              disabled={submitting || word.trim().length === 0}
            >
              {submitting ? t('play.checking') : t('play.submit')}
            </button>
          </form>
        )}

        {isRush && !spectator && (
          <p className={`${ui.muted} ${ui.small}`}>{t('play.rushNote')}</p>
        )}

        {feedback && (
          <p
            className={`${styles.feedback} ${
              feedback.tone === 'ok' ? styles.feedbackOk : styles.feedbackBad
            }`}
            role="status"
          >
            {feedback.text}
          </p>
        )}

        {!spectator && (
          <div className={styles.tools}>
            {powerUp && (
              <div className={styles.powerUp}>
                <div>
                  <strong>{powerLabel}</strong>
                  <p className={`${ui.muted} ${ui.small}`}>
                    {powerUpUsed ? t('play.powerUpUsed') : powerDesc}
                  </p>
                </div>
                <button
                  className={`${ui.button} ${styles.toolButton}`}
                  onClick={handlePowerUp}
                  disabled={powerUpUsed || powerBusy || locked}
                >
                  {t('play.usePowerUp')}
                </button>
              </div>
            )}
          </div>
        )}

        <div className={ui.feed}>
          <h3>{t('play.wordsInPlay')}</h3>
          {submissions.length === 0 ? (
            <p className={ui.muted}>
              {t(me?.submitted ? 'play.noWords' : 'play.hiddenWords')}
            </p>
          ) : (
            <ul className={ui.feedList}>
              {submissions.map((submission, index) => (
                <li key={`${submission.playerId}-${submission.at}`} className={ui.feedItem}>
                  <span className={ui.feedWord}>
                    {submission.word}
                    {submission.multiplier > 1 && (
                      <span className={styles.multiplier}>×{submission.multiplier}</span>
                    )}
                  </span>
                  <span className={ui.feedPlayer}>
                    {submission.playerName}
                    {index === 0 ? t('common.first') : ''}
                  </span>
                  <span className={ui.feedPoints}>+{submission.points}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <PlayerList
        players={room.players}
        playerId={playerId}
        language={language}
        title={t('lobby.players')}
        showScores={false}
        showSubmitted
      />
    </main>
  )
}
