import { ROUND_DURATION_MS } from '../../shared/game'
import type { RoomState } from '../../shared/types'
import { PlayerList } from './PlayerList'
import { RoomCode } from './RoomCode'

interface LobbyProps {
  room: RoomState
  playerId: string
  isHost: boolean
  busy: boolean
  onStart: () => void
}

export const Lobby = ({ room, playerId, isHost, busy, onStart }: LobbyProps) => (
  <main className="layout">
    <section className="card card--wide lobby">
      <div className="card__head">
        <div>
          <p className="eyebrow">Lobby</p>
          <h2>Waiting for players</h2>
        </div>
        <RoomCode code={room.code} />
      </div>

      <p className="muted">
        Share the code so friends can join. The host starts the match when everyone is ready.
      </p>

      <ul className="facts">
        <li>
          <strong>{room.maxRounds}</strong>
          <span>rounds</span>
        </li>
        <li>
          <strong>{Math.round(ROUND_DURATION_MS / 1000)}s</strong>
          <span>per round</span>
        </li>
        <li>
          <strong>{room.players.filter((player) => player.connected).length}</strong>
          <span>ready</span>
        </li>
      </ul>

      {isHost ? (
        <button className="button button--primary" onClick={onStart} disabled={busy}>
          {busy ? 'Starting...' : 'Start game'}
        </button>
      ) : (
        <p className="waiting">Waiting for the host to start...</p>
      )}
    </section>

    <PlayerList
      players={room.players}
      playerId={playerId}
      title="Players"
      showScores={false}
      showSubmitted={false}
    />
  </main>
)
