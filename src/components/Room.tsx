import type { SubmitResult } from '../../shared/events'
import type { RoomState } from '../../shared/types'
import ui from '../styles/ui.module.scss'
import type { ConnectionStatus } from '../connection'
import { GameOver } from './GameOver'
import { Lobby } from './Lobby'
import { PlayingRound } from './PlayingRound'
import { Results } from './Results'
import styles from './Room.module.scss'

interface RoomProps {
  room: RoomState
  playerId: string
  serverOffset: number
  status: ConnectionStatus
  busy: boolean
  onLeave: () => void
  onStart: () => void
  onNext: () => void
  onRestart: () => void
  onAddBot: () => void
  onRemoveBot: (botId: string) => void
  onShowRules: () => void
  onSubmit: (word: string) => Promise<SubmitResult>
}

export const Room = ({
  room,
  playerId,
  serverOffset,
  status,
  busy,
  onLeave,
  onStart,
  onNext,
  onRestart,
  onAddBot,
  onRemoveBot,
  onShowRules,
  onSubmit,
}: RoomProps) => {
  const isHost = room.hostId === playerId
  const statusClass =
    status === 'connected'
      ? ui.statusConnected
      : status === 'connecting'
        ? ui.statusConnecting
        : ui.statusDisconnected

  return (
    <div className={styles.room}>
      <header className={styles.roomHeader}>
        <div className={styles.roomIdentity}>
          <span className={`${ui.brand} ${styles.roomLogo}`}>
            Word<span>Rush</span>
          </span>
          <span className={styles.roomCode}>
            Room <strong>{room.code}</strong>
          </span>
        </div>
        <div className={styles.roomActions}>
          <span className={`${ui.status} ${statusClass}`}>
            <span className={ui.statusDot} />
            {status === 'connected' ? 'live' : status}
          </span>
          <button className={`${ui.button} ${ui.buttonGhost}`} onClick={onShowRules}>
            Rules
          </button>
          <button className={`${ui.button} ${ui.buttonGhost}`} onClick={onLeave}>
            Leave
          </button>
        </div>
      </header>

      {status !== 'connected' && (
        <div className={styles.banner}>Reconnecting to the room...</div>
      )}

      {room.phase === 'lobby' && (
        <Lobby
          room={room}
          playerId={playerId}
          isHost={isHost}
          busy={busy}
          onStart={onStart}
          onAddBot={onAddBot}
          onRemoveBot={onRemoveBot}
        />
      )}

      {room.phase === 'playing' && (
        <PlayingRound
          room={room}
          playerId={playerId}
          serverOffset={serverOffset}
          onSubmit={onSubmit}
        />
      )}

      {room.phase === 'reveal' && (
        <Results
          room={room}
          playerId={playerId}
          isHost={isHost}
          busy={busy}
          onNext={onNext}
        />
      )}

      {room.phase === 'finished' && (
        <GameOver
          room={room}
          playerId={playerId}
          isHost={isHost}
          busy={busy}
          onRestart={onRestart}
        />
      )}
    </div>
  )
}
