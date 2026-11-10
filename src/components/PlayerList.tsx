import type { Player } from '../../shared/types'
import ui from '../styles/ui.module.scss'
import styles from './PlayerList.module.scss'

interface PlayerListProps {
  players: Player[]
  playerId: string
  title?: string
  showScores?: boolean
  showSubmitted?: boolean
  onRemoveBot?: (botId: string) => void
}

export const PlayerList = ({
  players,
  playerId,
  title = 'Players',
  showScores = true,
  showSubmitted = false,
  onRemoveBot,
}: PlayerListProps) => (
  <section className={ui.card}>
    <div className={ui.cardHead}>
      <h2>{title}</h2>
      <span className={ui.pill}>{players.length}</span>
    </div>
    <ol className={styles.list}>
      {players.map((player, index) => (
        <li
          key={player.id}
          className={[
            styles.item,
            player.id === playerId ? styles.isYou : '',
            player.connected ? '' : styles.isOffline,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span className={styles.rank}>
            {showScores ? index + 1 : <span className={styles.dot} />}
          </span>
          <span className={styles.name}>
            {player.name}
            {player.isHost && <span className={ui.tag}>host</span>}
            {player.isBot && <span className={`${ui.tag} ${ui.tagBot}`}>bot</span>}
            {player.id === playerId && <span className={`${ui.tag} ${ui.tagYou}`}>you</span>}
            {!player.connected && <span className={`${ui.tag} ${ui.tagOffline}`}>offline</span>}
          </span>
          {showSubmitted && (
            <span className={`${styles.check} ${player.submitted ? styles.isDone : ''}`}>
              {player.submitted ? 'locked' : 'thinking'}
            </span>
          )}
          {showScores && <span className={styles.score}>{player.score}</span>}
          {onRemoveBot && player.isBot && (
            <button
              className={styles.remove}
              onClick={() => onRemoveBot(player.id)}
              title={`Remove ${player.name}`}
              aria-label={`Remove ${player.name}`}
            >
              ×
            </button>
          )}
        </li>
      ))}
    </ol>
  </section>
)
