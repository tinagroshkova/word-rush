import type { RoomState } from '../../shared/types'
import { PlayerList } from './PlayerList'

interface ResultsProps {
  room: RoomState
  playerId: string
  isHost: boolean
  busy: boolean
  onNext: () => void
  onRestart: () => void
}

export const Results = ({
  room,
  playerId,
  isHost,
  busy,
  onNext,
  onRestart,
}: ResultsProps) => {
  const finished = room.phase === 'finished'
  const round = room.round
  const submissions = round ? [...round.submissions].sort((a, b) => b.points - a.points) : []

  const top = room.players[0]
  const tied = room.players.length > 1 && room.players[1]?.score === top?.score
  const champion = finished && top ? (tied ? 'It is a tie!' : `${top.name} wins!`) : null

  return (
    <main className="layout layout--results">
      <section className="card card--wide results">
        <div className="card__head">
          <div>
            <p className="eyebrow">
              {finished
                ? 'Final scores'
                : `Round ${round?.index ?? room.roundNumber} of ${room.maxRounds}`}
            </p>
            <h2>{finished ? 'Game over' : 'Round complete'}</h2>
            {champion && <p className="champion">{champion}</p>}
          </div>
          {round && (
            <div className="target target--small">
              <p className="target__label">Target</p>
              <p className="target__letters">{round.target.toUpperCase()}</p>
            </div>
          )}
        </div>

        <div className="results__grid">
          <div>
            <h3>{finished ? 'Final round words' : 'Round words'}</h3>
            {submissions.length === 0 ? (
              <p className="muted">Nobody found a word this round.</p>
            ) : (
              <ul className="feed__list">
                {submissions.map((submission, index) => (
                  <li
                    key={`${submission.playerId}-${submission.at}`}
                    className={`feed__item ${index === 0 ? 'is-winner' : ''}`}
                  >
                    <span className="feed__word">{submission.word}</span>
                    <span className="feed__player">
                      {submission.playerName}
                      {index === 0 ? ' · first blood' : ''}
                    </span>
                    <span className="feed__points">+{submission.points}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <PlayerList
            players={room.players}
            playerId={playerId}
            title="Leaderboard"
            showScores
          />
        </div>

        {isHost ? (
          finished ? (
            <button className="button button--primary" onClick={onRestart} disabled={busy}>
              {busy ? 'Restarting...' : 'Play again'}
            </button>
          ) : (
            <button className="button button--primary" onClick={onNext} disabled={busy}>
              {busy ? 'Starting...' : 'Next round'}
            </button>
          )
        ) : (
          <p className="waiting">
            {finished
              ? 'Waiting for the host to start a rematch...'
              : 'Waiting for the host to continue...'}
          </p>
        )}
      </section>
    </main>
  )
}
