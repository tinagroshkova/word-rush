import { ROUND_DURATION_MS } from '../../shared/game'
import type { RoomState } from '../../shared/types'
import ui from '../styles/ui.module.scss'
import { PlayerList } from './PlayerList'
import { RoomCode } from './RoomCode'
import styles from './Lobby.module.scss'

interface LobbyProps {
  room: RoomState
  playerId: string
  isHost: boolean
  busy: boolean
  onStart: () => void
  onAddBot: () => void
  onRemoveBot: (botId: string) => void
}

const ROOM_CAPACITY = 12

export const Lobby = ({
  room,
  playerId,
  isHost,
  busy,
  onStart,
  onAddBot,
  onRemoveBot,
}: LobbyProps) => {
  const humanCount = room.players.filter((player) => !player.isBot && player.connected).length
  const botCount = room.players.filter((player) => player.isBot).length
  const soloStart = humanCount === 1 && botCount === 0

  return (
    <main className={ui.layout}>
      <section className={`${ui.card} ${ui.cardWide}`}>
        <div className={ui.cardHead}>
          <div>
            <p className={ui.eyebrow}>Lobby</p>
            <h2>Waiting for players</h2>
          </div>
          <RoomCode code={room.code} />
        </div>

        <p className={ui.muted}>
          Share the code so friends can join. The host starts the match when everyone is ready.
        </p>

        <ul className={styles.facts}>
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

        {isHost && (
          <div className={styles.botControls}>
            <div>
              <strong>Bots</strong>
              <p className={`${ui.muted} ${ui.small}`}>
                Add computer players to keep the room competitive. Starting alone fills three
                seats automatically.
              </p>
            </div>
            <button
              className={ui.button}
              onClick={onAddBot}
              disabled={busy || room.players.length >= ROOM_CAPACITY}
            >
              Add bot
            </button>
          </div>
        )}

        {isHost ? (
          <button
            className={`${ui.button} ${ui.buttonPrimary} ${styles.startButton}`}
            onClick={onStart}
            disabled={busy}
          >
            {busy ? 'Starting...' : soloStart ? 'Start with bots' : 'Start game'}
          </button>
        ) : (
          <p className={ui.waiting}>Waiting for the host to start...</p>
        )}
      </section>

      <PlayerList
        players={room.players}
        playerId={playerId}
        title="Players"
        showScores={false}
        showSubmitted={false}
        onRemoveBot={isHost ? onRemoveBot : undefined}
      />
    </main>
  )
}
