import { useEffect, useState, type FormEvent } from 'react'
import type { SubmitResult } from '../../shared/events'
import { describeReason, MAX_WORD_LENGTH, MIN_WORD_LENGTH } from '../../shared/game'
import { translate, type MessageKey, type MessageVars } from '../../shared/i18n'
import type { LanguageCode } from '../../shared/languages'
import type { RoomState } from '../../shared/types'
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
}

type Feedback = { tone: 'ok' | 'bad'; text: string }

export const PlayingRound = ({
  room,
  language,
  playerId,
  serverOffset,
  onSubmit,
}: PlayingRoundProps) => {
  const round = room.round
  const me = room.players.find((player) => player.id === playerId)
  const [word, setWord] = useState('')
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const t = (key: MessageKey, vars?: MessageVars) => translate(language, key, vars)

  useEffect(() => {
    setWord('')
    setFeedback(null)
  }, [round?.index])

  if (!round) {
    return null
  }

  const locked = me?.submitted ?? false
  const submissions = locked ? [...round.submissions].sort((a, b) => a.at - b.at) : []

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    if (locked || submitting) {
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
      setFeedback({
        tone: 'ok',
        text: t('play.accepted', {
          word: result.outcome.word,
          points: result.outcome.points,
        }),
      })
    } else {
      setFeedback({
        tone: 'bad',
        text: result.reason
          ? describeReason(language, result.reason)
          : result.error ?? t('play.didNotCount'),
      })
    }
  }

  return (
    <main className={`${ui.layout} ${ui.layoutGame}`}>
      <section className={`${ui.card} ${ui.cardWide} ${styles.game}`}>
        <div className={styles.gameTop}>
          <span className={ui.pill}>
            {t('play.round', { index: round.index, total: room.maxRounds })}
          </span>
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

        {locked ? (
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
                  min: MIN_WORD_LENGTH,
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

        <div className={ui.feed}>
          <h3>{t('play.wordsInPlay')}</h3>
          {submissions.length === 0 ? (
            <p className={ui.muted}>{t(locked ? 'play.noWords' : 'play.hiddenWords')}</p>
          ) : (
            <ul className={ui.feedList}>
              {submissions.map((submission, index) => (
                <li key={`${submission.playerId}-${submission.at}`} className={ui.feedItem}>
                  <span className={ui.feedWord}>{submission.word}</span>
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
