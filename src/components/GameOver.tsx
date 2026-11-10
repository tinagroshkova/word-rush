import { ordinal, translate, type MessageKey, type MessageVars } from '../../shared/i18n'
import type { LanguageCode } from '../../shared/languages'
import type { Player, RoomState } from '../../shared/types'
import ui from '../styles/ui.module.scss'
import styles from './GameOver.module.scss'

interface GameOverProps {
  room: RoomState
  language: LanguageCode
  playerId: string
  isHost: boolean
  busy: boolean
  onRestart: () => void
}

interface Standing {
  player: Player
  place: number
}

const buildStandings = (players: Player[]): Standing[] =>
  players.reduce<Standing[]>((rows, player, index) => {
    const previous = rows[index - 1]
    const place = previous && previous.player.score === player.score ? previous.place : index + 1
    rows.push({ player, place })
    return rows
  }, [])

const placeClass = (place: number): string | undefined =>
  place === 1 ? styles.row1 : place === 2 ? styles.row2 : place === 3 ? styles.row3 : ''

export const GameOver = ({
  room,
  language,
  playerId,
  isHost,
  busy,
  onRestart,
}: GameOverProps) => {
  const standings = buildStandings(room.players)
  const winners = standings.filter((standing) => standing.place === 1)
  const t = (key: MessageKey, vars?: MessageVars) => translate(language, key, vars)
  const champion =
    winners.length > 1
      ? t('over.tie', {
          names: winners.map((winner) => winner.player.name).join(', '),
        })
      : t('over.winner', { name: winners[0]?.player.name ?? t('over.nobody') })

  return (
    <main className={`${ui.layout} ${ui.layoutResults}`}>
      <section className={`${ui.card} ${ui.cardWide} ${ui.results} ${styles.gameOver}`}>
        <div className={`${ui.cardHead} ${styles.head}`}>
          <div>
            <p className={ui.eyebrow}>{t('over.eyebrow')}</p>
            <h2>{t('over.title')}</h2>
            <p className={styles.champion}>{champion}</p>
          </div>
          <span className={ui.pill}>{t('over.rounds', { count: room.maxRounds })}</span>
        </div>

        <ol className={styles.standings}>
          {standings.map(({ player, place }) => (
            <li
              key={player.id}
              className={[
                styles.row,
                placeClass(place),
                player.id === playerId ? styles.isYou : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className={styles.place}>{ordinal(language, place)}</span>
              <span className={styles.name}>
                {player.name}
                {player.isHost && <span className={ui.tag}>{t('common.host')}</span>}
                {player.isBot && <span className={`${ui.tag} ${ui.tagBot}`}>{t('common.bot')}</span>}
                {player.id === playerId && (
                  <span className={`${ui.tag} ${ui.tagYou}`}>{t('common.you')}</span>
                )}
              </span>
              <span className={styles.points}>
                {player.score}
                <span className={styles.unit}>{t('common.pts')}</span>
              </span>
            </li>
          ))}
        </ol>

        {isHost ? (
          <button
            className={`${ui.button} ${ui.buttonPrimary}`}
            onClick={onRestart}
            disabled={busy}
          >
            {busy ? t('over.restarting') : t('over.playAgain')}
          </button>
        ) : (
          <p className={ui.waiting}>{t('over.waitingHost')}</p>
        )}
      </section>
    </main>
  )
}
