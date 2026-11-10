import type { Player, RoomState } from '../../shared/types'
import ui from '../styles/ui.module.scss'
import styles from './GameOver.module.scss'

interface GameOverProps {
  room: RoomState
  playerId: string
  isHost: boolean
  busy: boolean
  onRestart: () => void
}

interface Standing {
  player: Player
  place: number
}

const ordinal = (value: number): string => {
  const mod100 = value % 100
  if (mod100 >= 11 && mod100 <= 13) {
    return `${value}th`
  }

  switch (value % 10) {
    case 1:
      return `${value}st`
    case 2:
      return `${value}nd`
    case 3:
      return `${value}rd`
    default:
      return `${value}th`
  }
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

export const GameOver = ({ room, playerId, isHost, busy, onRestart }: GameOverProps) => {
  const standings = buildStandings(room.players)
  const winners = standings.filter((standing) => standing.place === 1)
  const champion =
    winners.length > 1
      ? `It's a tie between ${winners.map((winner) => winner.player.name).join(', ')}!`
      : `${winners[0]?.player.name ?? 'Nobody'} wins!`

  return (
    <main className={`${ui.layout} ${ui.layoutResults}`}>
      <section className={`${ui.card} ${ui.cardWide} ${ui.results} ${styles.gameOver}`}>
        <div className={`${ui.cardHead} ${styles.head}`}>
          <div>
            <p className={ui.eyebrow}>Final standings</p>
            <h2>Game over</h2>
            <p className={styles.champion}>{champion}</p>
          </div>
          <span className={ui.pill}>{room.maxRounds} rounds</span>
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
              <span className={styles.place}>{ordinal(place)}</span>
              <span className={styles.name}>
                {player.name}
                {player.isHost && <span className={ui.tag}>host</span>}
                {player.isBot && <span className={`${ui.tag} ${ui.tagBot}`}>bot</span>}
                {player.id === playerId && <span className={`${ui.tag} ${ui.tagYou}`}>you</span>}
              </span>
              <span className={styles.points}>
                {player.score}
                <span className={styles.unit}>pts</span>
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
            {busy ? 'Restarting...' : 'Play again'}
          </button>
        ) : (
          <p className={ui.waiting}>Waiting for the host to start a rematch...</p>
        )}
      </section>
    </main>
  )
}
