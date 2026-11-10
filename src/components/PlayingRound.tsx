import { useEffect, useState, type FormEvent } from 'react'
import type { SubmitResult } from '../../shared/events'
import { MAX_WORD_LENGTH, MIN_WORD_LENGTH } from '../../shared/game'
import type { RoomState } from '../../shared/types'
import ui from '../styles/ui.module.scss'
import { Countdown } from './Countdown'
import { PlayerList } from './PlayerList'
import styles from './PlayingRound.module.scss'

interface PlayingRoundProps {
  room: RoomState
  playerId: string
  serverOffset: number
  onSubmit: (word: string) => Promise<SubmitResult>
}

type Feedback = { tone: 'ok' | 'bad'; text: string }

export const PlayingRound = ({
  room,
  playerId,
  serverOffset,
  onSubmit,
}: PlayingRoundProps) => {
  const round = room.round
  const me = room.players.find((player) => player.id === playerId)
  const [word, setWord] = useState('')
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setWord('')
    setFeedback(null)
  }, [round?.index])

  if (!round) {
    return null
  }

  const locked = me?.submitted ?? false
  const submissions = [...round.submissions].sort((a, b) => a.at - b.at)

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
        text: `Accepted "${result.outcome.word}" for ${result.outcome.points} points`,
      })
    } else {
      setFeedback({
        tone: 'bad',
        text: result.error ?? 'That word did not count',
      })
    }
  }

  return (
    <main className={`${ui.layout} ${ui.layoutGame}`}>
      <section className={`${ui.card} ${ui.cardWide} ${styles.game}`}>
        <div className={styles.gameTop}>
          <span className={ui.pill}>
            Round {round.index} / {room.maxRounds}
          </span>
          <Countdown
            endsAt={round.endsAt}
            serverOffset={serverOffset}
            durationMs={round.durationMs}
          />
        </div>

        <div className={ui.target}>
          <p className={ui.targetLabel}>Your word must contain</p>
          <p className={ui.targetLetters}>{round.target.toUpperCase()}</p>
        </div>

        {locked ? (
          <div className={styles.locked}>
            <p className={styles.lockedTitle}>Locked in</p>
            <p className={ui.muted}>Nice. Wait for the round to end to see everyone&apos;s words.</p>
          </div>
        ) : (
          <form className={styles.wordForm} onSubmit={handleSubmit}>
            <label className={`${ui.field} ${styles.wordField}`}>
              <span className={ui.fieldLabel}>Your word</span>
              <input
                value={word}
                onChange={(event) => setWord(event.target.value.toLowerCase())}
                placeholder={`Contains "${round.target}" · ${MIN_WORD_LENGTH}+ letters`}
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
              {submitting ? 'Checking...' : 'Submit word'}
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
          <h3>Words in play</h3>
          {submissions.length === 0 ? (
            <p className={ui.muted}>No words yet. Be the first.</p>
          ) : (
            <ul className={ui.feedList}>
              {submissions.map((submission, index) => (
                <li key={`${submission.playerId}-${submission.at}`} className={ui.feedItem}>
                  <span className={ui.feedWord}>{submission.word}</span>
                  <span className={ui.feedPlayer}>
                    {submission.playerName}
                    {index === 0 ? ' · first' : ''}
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
        title="Players"
        showScores={false}
        showSubmitted
      />
    </main>
  )
}
