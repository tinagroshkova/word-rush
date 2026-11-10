import { useEffect, useState, type FormEvent } from 'react'
import type { SubmitResult } from '../../shared/events'
import { MAX_WORD_LENGTH, MIN_WORD_LENGTH } from '../../shared/game'
import type { RoomState } from '../../shared/types'
import { Countdown } from './Countdown'
import { PlayerList } from './PlayerList'

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
    <main className="layout layout--game">
      <section className="card card--wide game">
        <div className="game__top">
          <span className="pill">
            Round {round.index} / {room.maxRounds}
          </span>
          <Countdown
            endsAt={round.endsAt}
            serverOffset={serverOffset}
            durationMs={round.durationMs}
          />
        </div>

        <div className="target">
          <p className="target__label">Your word must contain</p>
          <p className="target__letters">{round.target.toUpperCase()}</p>
        </div>

        {locked ? (
          <div className="locked">
            <p className="locked__title">Locked in</p>
            <p className="muted">Nice. Wait for the round to end to see everyone&apos;s words.</p>
          </div>
        ) : (
          <form className="word-form" onSubmit={handleSubmit}>
            <label className="field">
              <span className="field__label">Your word</span>
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
              className="button button--primary"
              type="submit"
              disabled={submitting || word.trim().length === 0}
            >
              {submitting ? 'Checking...' : 'Submit word'}
            </button>
          </form>
        )}

        {feedback && (
          <p className={`feedback feedback--${feedback.tone}`} role="status">
            {feedback.text}
          </p>
        )}

        <div className="feed">
          <h3>Words in play</h3>
          {submissions.length === 0 ? (
            <p className="muted">No words yet. Be the first.</p>
          ) : (
            <ul className="feed__list">
              {submissions.map((submission, index) => (
                <li key={`${submission.playerId}-${submission.at}`} className="feed__item">
                  <span className="feed__word">{submission.word}</span>
                  <span className="feed__player">
                    {submission.playerName}
                    {index === 0 ? ' · first' : ''}
                  </span>
                  <span className="feed__points">+{submission.points}</span>
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
