import { ROUND_DURATION_MS } from '../../shared/game'
import { translate, type MessageKey, type MessageVars } from '../../shared/i18n'
import type { LanguageCode } from '../../shared/languages'
import type { RoomState } from '../../shared/types'
import ui from '../styles/ui.module.scss'
import { PlayerList } from './PlayerList'
import { RoomCode } from './RoomCode'
import styles from './Lobby.module.scss'

interface LobbyProps {
  room: RoomState
  language: LanguageCode
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
  language,
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
  const t = (key: MessageKey, vars?: MessageVars) => translate(language, key, vars)

  return (
    <main className={ui.layout}>
      <section className={`${ui.card} ${ui.cardWide}`}>
        <div className={ui.cardHead}>
          <div>
            <p className={ui.eyebrow}>{t('lobby.eyebrow')}</p>
            <h2>{t('lobby.waiting')}</h2>
          </div>
          <RoomCode code={room.code} language={language} />
        </div>

        <p className={ui.muted}>{t('lobby.share')}</p>

        <ul className={styles.facts}>
          <li>
            <strong>{room.maxRounds}</strong>
            <span>{t('common.rounds')}</span>
          </li>
          <li>
            <strong>{Math.round(ROUND_DURATION_MS / 1000)}s</strong>
            <span>{t('common.perRound')}</span>
          </li>
          <li>
            <strong>{room.players.filter((player) => player.connected).length}</strong>
            <span>{t('common.ready')}</span>
          </li>
        </ul>

        {isHost && (
          <div className={styles.botControls}>
            <div>
              <strong>{t('lobby.bots')}</strong>
              <p className={`${ui.muted} ${ui.small}`}>{t('lobby.botsNote')}</p>
            </div>
            <button
              className={ui.button}
              onClick={onAddBot}
              disabled={busy || room.players.length >= ROOM_CAPACITY}
            >
              {t('lobby.addBot')}
            </button>
          </div>
        )}

        {isHost ? (
          <button
            className={`${ui.button} ${ui.buttonPrimary} ${styles.startButton}`}
            onClick={onStart}
            disabled={busy}
          >
            {busy ? t('lobby.starting') : soloStart ? t('lobby.startWithBots') : t('lobby.startGame')}
          </button>
        ) : (
          <p className={ui.waiting}>{t('lobby.waitingHost')}</p>
        )}
      </section>

      <PlayerList
        players={room.players}
        playerId={playerId}
        language={language}
        title={t('lobby.players')}
        showScores={false}
        showSubmitted={false}
        onRemoveBot={isHost ? onRemoveBot : undefined}
      />
    </main>
  )
}
