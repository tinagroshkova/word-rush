import type { RoomState } from '../../shared/types'
import ui from '../styles/ui.module.scss'
import { PlayerList } from './PlayerList'
import styles from './Results.module.scss'

interface ResultsProps {
  room: RoomState
  playerId: string
  isHost: boolean
  busy: boolean
  onNext: () => void
}

export const Results = ({ room, playerId, isHost, busy, onNext }: ResultsProps) => {
  const round = room.round
  const submissions = round ? [...round.submissions].sort((a, b) => b.points - a.points) : []

  return (
    <main className={`${ui.layout} ${ui.layoutResults}`}>
      <section className={`${ui.card} ${ui.cardWide} ${ui.results}`}>
        <div className={ui.cardHead}>
          <div>
            <p className={ui.eyebrow}>
              Round {round?.index ?? room.roundNumber} of {room.maxRounds}
            </p>
            <h2>Round complete</h2>
          </div>
          {round && (
            <div className={`${ui.target} ${ui.targetSmall}`}>
              <p className={ui.targetLabel}>Target</p>
              <p className={ui.targetLetters}>{round.target.toUpperCase()}</p>
            </div>
          )}
        </div>

        <div className={styles.resultsGrid}>
          <div>
            <h3>Round words</h3>
            {submissions.length === 0 ? (
              <p className={ui.muted}>Nobody found a word this round.</p>
            ) : (
              <ul className={ui.feedList}>
                {submissions.map((submission, index) => (
                  <li
                    key={`${submission.playerId}-${submission.at}`}
                    className={`${ui.feedItem} ${index === 0 ? ui.feedWinner : ''}`}
                  >
                    <span className={ui.feedWord}>{submission.word}</span>
                    <span className={ui.feedPlayer}>
                      {submission.playerName}
                      {index === 0 ? ' · first blood' : ''}
                    </span>
                    <span className={ui.feedPoints}>+{submission.points}</span>
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
          <button
            className={`${ui.button} ${ui.buttonPrimary} ${styles.nextButton}`}
            onClick={onNext}
            disabled={busy}
          >
            {busy ? 'Starting...' : 'Next round'}
          </button>
        ) : (
          <p className={ui.waiting}>Waiting for the host to continue...</p>
        )}
      </section>
    </main>
  )
}
