import { translate, type MessageKey, type MessageVars } from '../../shared/i18n'
import type { LanguageCode } from '../../shared/languages'
import type { RoomState, Submission } from '../../shared/types'
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

interface PlayerGroup {
  playerId: string
  playerName: string
  total: number
  words: Submission[]
}

const groupByPlayer = (submissions: Submission[]): PlayerGroup[] => {
  const groups = new Map<string, PlayerGroup>()
  for (const submission of submissions) {
    const group = groups.get(submission.playerId) ?? {
      playerId: submission.playerId,
      playerName: submission.playerName,
      total: 0,
      words: [],
    }
    group.words.push(submission)
    group.total += submission.points
    groups.set(submission.playerId, group)
  }
  return [...groups.values()]
    .map((group) => ({
      ...group,
      words: [...group.words].sort((a, b) => b.points - a.points),
    }))
    .sort((a, b) => b.total - a.total || a.playerName.localeCompare(b.playerName))
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
  const all = round?.submissions ?? []
  const submissions = [...all].sort((a, b) => b.points - a.points)
  const isRush = round?.mode === 'rush'
  const groups = isRush ? groupByPlayer(all) : []
  const t = (key: MessageKey, vars?: MessageVars) => translate(language, key, vars)

  const longest = all.reduce<(typeof all)[number] | null>(
    (best, entry) => (!best || entry.word.length > best.word.length ? entry : best),
    null,
  )
  const fastest = all.reduce<(typeof all)[number] | null>(
    (best, entry) => (!best || entry.at < best.at ? entry : best),
    null,
  )
  const topWord = submissions[0] ?? null
  const bestStreak = all.reduce((max, entry) => Math.max(max, entry.streak), 0)
  const recap: {
    label: string
    tip: string
    word?: string
    player?: string
    value?: string
  }[] = [
    {
      label: t('results.longest'),
      tip: t('results.longestTip'),
      word: longest?.word,
      player: longest?.playerName,
    },
    {
      label: t('results.fastest'),
      tip: t('results.fastestTip'),
      word: fastest?.word,
      player: fastest?.playerName,
    },
    {
      label: t('results.topWord'),
      tip: t('results.topWordTip'),
      word: topWord?.word,
      player: topWord?.playerName,
    },
    {
      label: t('results.streak'),
      tip: t('results.streakTip'),
      value: bestStreak > 0 ? String(bestStreak) : t('results.none'),
    },
  ]

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

        <div className={styles.recap}>
          <h3>{t('results.recap')}</h3>
          <dl className={styles.recapGrid}>
            {recap.map((item) => (
              <div
                key={item.label}
                className={styles.recapItem}
                data-tooltip={item.tip}
                tabIndex={0}
              >
                <dt>{item.label}</dt>
                <dd>
                  {item.word ?? item.value}
                  {item.player && <span className={styles.recapPlayer}>{item.player}</span>}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className={styles.resultsGrid}>
          <div>
            <h3>{t('results.roundWords')}</h3>
            {submissions.length === 0 ? (
              <p className={ui.muted}>{t('results.noWords')}</p>
            ) : isRush ? (
              <div className={styles.groups}>
                {groups.map((group, index) => (
                  <section key={group.playerId} className={styles.group}>
                    <header className={styles.groupHead}>
                      <span
                        className={`${styles.groupRank} ${
                          index === 0
                            ? styles.rankGold
                            : index === 1
                              ? styles.rankSilver
                              : index === 2
                                ? styles.rankBronze
                                : ''
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span className={styles.groupName}>
                        {group.playerName}
                        {group.playerId === playerId && (
                          <span className={`${ui.tag} ${ui.tagYou}`}>{t('common.you')}</span>
                        )}
                      </span>
                      <span className={styles.groupMeta}>
                        {t('results.wordCount', { count: group.words.length })}
                      </span>
                      <span className={styles.groupTotal}>+{group.total}</span>
                    </header>
                    <ul className={styles.groupWords}>
                      {group.words.map((submission) => (
                        <li key={`${submission.playerId}-${submission.at}`}>
                          <span className={styles.wordText}>
                            {submission.word}
                            {submission.multiplier > 1 && (
                              <span className={styles.multiplier}>×{submission.multiplier}</span>
                            )}
                          </span>
                          <span className={styles.wordPoints}>+{submission.points}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
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
