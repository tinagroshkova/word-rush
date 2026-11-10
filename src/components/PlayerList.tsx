import type { Player } from '../../shared/types'

interface PlayerListProps {
  players: Player[]
  playerId: string
  title?: string
  showScores?: boolean
  showSubmitted?: boolean
}

export const PlayerList = ({
  players,
  playerId,
  title = 'Players',
  showScores = true,
  showSubmitted = false,
}: PlayerListProps) => (
  <section className="card players">
    <div className="card__head">
      <h2>{title}</h2>
      <span className="pill">{players.length}</span>
    </div>
    <ol className="players__list">
      {players.map((player, index) => (
        <li
          key={player.id}
          className={[
            'players__item',
            player.id === playerId ? 'is-you' : '',
            player.connected ? '' : 'is-offline',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span className="players__rank">
            {showScores ? index + 1 : <span className="dot" />}
          </span>
          <span className="players__name">
            {player.name}
            {player.isHost && <span className="tag">host</span>}
            {player.id === playerId && <span className="tag tag--you">you</span>}
            {!player.connected && <span className="tag tag--offline">offline</span>}
          </span>
          {showSubmitted && (
            <span className={`players__check ${player.submitted ? 'is-done' : ''}`}>
              {player.submitted ? 'locked' : 'thinking'}
            </span>
          )}
          {showScores && <span className="players__score">{player.score}</span>}
        </li>
      ))}
    </ol>
  </section>
)
