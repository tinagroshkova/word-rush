import { translate, type MessageKey, type MessageVars } from '../../shared/i18n'
import type { LanguageCode } from '../../shared/languages'
import type { RoomState } from '../../shared/types'
import ui from '../styles/ui.module.scss'
import { PlayerList } from './PlayerList'
import styles from './Results.module.scss'

interface ResultsProps {
  room: RoomState
  language: LanguageCode
  playerId: string
  isHost: boolean
  busy: boolean
  onNext: () => void
}

export const Results = ({
  room,
  language,
  playerId,
  isHost,
  busy,
  onNext,
}: ResultsProps) => {
  const round = room.round
  const submissions = round ? [...round.submissions].sort((a, b) => b.points - a.points) : []
  const t = (key: MessageKey, vars?: MessageVars) => translate(language, key, vars)

  return (
    <main className={`${ui.layout} ${ui.layoutResults}`}>
      <section className={`${ui.card} ${ui.cardWide} ${ui.results}`}>
        <div className={ui.cardHead}>
          <div>
            <p className={ui.eyebrow}>
              {t('results.roundOf', {
                index: round?.index ?? room.roundNumber,
                total: room.maxRounds,
              })}
            </p>
            <h2>{t('results.complete')}</h2>
          </div>
          {round && (
            <div className={`${ui.target} ${ui.targetSmall}`}>
              <p className={ui.targetLabel}>{t('results.target')}</p>
              <p className={ui.targetLetters}>{round.target.toUpperCase()}</p>
            </div>
          )}
        </div>

        <div className={styles.resultsGrid}>
          <div>
            <h3>{t('results.roundWords')}</h3>
            {submissions.length === 0 ? (
              <p className={ui.muted}>{t('results.noWords')}</p>
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
                      {index === 0 ? t('common.firstBlood') : ''}
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
            language={language}
            title={t('results.leaderboard')}
            showScores
          />
        </div>

        {isHost ? (
          <button
            className={`${ui.button} ${ui.buttonPrimary} ${styles.nextButton}`}
            onClick={onNext}
            disabled={busy}
          >
            {busy ? t('results.starting') : t('results.nextRound')}
          </button>
        ) : (
          <p className={ui.waiting}>{t('results.waitingHost')}</p>
        )}
      </section>
    </main>
  )
}
