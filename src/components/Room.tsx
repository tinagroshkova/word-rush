import type { SubmitResult } from '../../shared/events'
import type { RoomState } from '../../shared/types'
import type { ConnectionStatus } from '../connection'
import { Lobby } from './Lobby'
import { PlayingRound } from './PlayingRound'
import { Results } from './Results'

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
  onSubmit,
}: RoomProps) => {
  const isHost = room.hostId === playerId

  return (
    <div className="room">
      <header className="room__header">
        <div className="room__identity">
          <span className="room__logo">
            Word<span>Rush</span>
          </span>
          <span className="room__code">
            Room <strong>{room.code}</strong>
          </span>
        </div>
        <div className="room__actions">
          <span className={`status status--${status}`}>
            <span className="status__dot" />
            {status === 'connected' ? 'live' : status}
          </span>
          <button className="button button--ghost" onClick={onLeave}>
            Leave
          </button>
        </div>
      </header>

      {status !== 'connected' && (
        <div className="banner">Reconnecting to the room...</div>
      )}

      {room.phase === 'lobby' && (
        <Lobby
          room={room}
          playerId={playerId}
          isHost={isHost}
          busy={busy}
          onStart={onStart}
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

      {(room.phase === 'reveal' || room.phase === 'finished') && (
        <Results
          room={room}
          playerId={playerId}
          isHost={isHost}
          busy={busy}
          onNext={onNext}
          onRestart={onRestart}
        />
      )}
    </div>
  )
}
