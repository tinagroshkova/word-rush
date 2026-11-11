import type { ActionResult, PowerUpResult, SubmitResult } from '../../shared/events'
import { translate, type MessageKey } from '../../shared/i18n'
import { LANGUAGES, type LanguageCode } from '../../shared/languages'
import type { PowerUpType, RoomSettings, RoomState } from '../../shared/types'
import ui from '../styles/ui.module.scss'
import type { ConnectionStatus } from '../connection'
import type { AchievementId, PlayerStats } from '../storage'
import { ChatPanel } from './ChatPanel'
import { GameOver } from './GameOver'
import { Lobby } from './Lobby'
import { PlayingRound } from './PlayingRound'
import { Results } from './Results'
import styles from './Room.module.scss'

interface RoomProps {
  room: RoomState
  language: LanguageCode
  playerId: string
  serverOffset: number
  status: ConnectionStatus
  busy: boolean
  stats: PlayerStats
  earnedAchievements: AchievementId[]
  onLeave: () => void
  onStart: () => void
  onNext: () => void
  onRestart: () => void
  onAddBot: () => void
  onRemoveBot: (botId: string) => void
  onShowRules: () => void
  onSubmit: (word: string) => Promise<SubmitResult>
  onUpdateSettings: (settings: Partial<RoomSettings>) => Promise<boolean>
  onUsePowerUp: (type: PowerUpType) => Promise<PowerUpResult>
  onEmote: (emoji: string) => void
  onSendChat: (text: string) => Promise<ActionResult>
  onWordAccepted: (word: string, points: number, streak: number) => void
}

export const Room = ({
  room,
  language,
  playerId,
  serverOffset,
  status,
  busy,
  stats,
  earnedAchievements,
  onLeave,
  onStart,
  onNext,
  onRestart,
  onAddBot,
  onRemoveBot,
  onShowRules,
  onSubmit,
  onUpdateSettings,
  onUsePowerUp,
  onEmote,
  onSendChat,
  onWordAccepted,
}: RoomProps) => {
  const isHost = room.hostId === playerId
  const t = (key: MessageKey) => translate(language, key)
  const wordLanguage = LANGUAGES.find((option) => option.code === room.language)
  const statusClass =
    status === 'connected'
      ? ui.statusConnected
      : status === 'connecting'
        ? ui.statusConnecting
        : ui.statusDisconnected
  const statusLabel =
    status === 'connected'
      ? t('status.live')
      : status === 'connecting'
        ? t('status.connecting')
        : t('status.disconnected')

  return (
    <div className={styles.room}>
      <header className={styles.roomHeader}>
        <div className={styles.roomIdentity}>
          <span className={styles.roomCode}>
            {t('common.room')} <strong>{room.code}</strong>
          </span>
          <span className={ui.tag} title={t('room.wordLanguage')}>
            {wordLanguage?.nativeLabel ?? room.language.toUpperCase()}
          </span>
          {room.daily && <span className={ui.tag}>{t('common.daily')}</span>}
        </div>
        <div className={styles.roomActions}>
          <span className={`${ui.status} ${statusClass}`}>
            <span className={ui.statusDot} />
            {statusLabel}
          </span>
          <button className={`${ui.button} ${ui.buttonGhost}`} onClick={onShowRules}>
            {t('common.rules')}
          </button>
          <button className={`${ui.button} ${ui.buttonGhost}`} onClick={onLeave}>
            {t('common.leave')}
          </button>
        </div>
      </header>

      {status !== 'connected' && (
        <div className={styles.banner}>{t('status.reconnecting')}</div>
      )}

      <div className={styles.roomBody}>
        <div className={styles.stage}>
          {room.phase === 'lobby' && (
            <Lobby
              room={room}
              language={language}
              playerId={playerId}
              isHost={isHost}
              busy={busy}
              onStart={onStart}
              onAddBot={onAddBot}
              onRemoveBot={onRemoveBot}
              onUpdateSettings={onUpdateSettings}
            />
          )}

          {room.phase === 'playing' && (
            <PlayingRound
              room={room}
              language={language}
              playerId={playerId}
              serverOffset={serverOffset}
              onSubmit={onSubmit}
              onUsePowerUp={onUsePowerUp}
              onWordAccepted={onWordAccepted}
            />
          )}

          {room.phase === 'reveal' && (
            <Results
              room={room}
              language={language}
              playerId={playerId}
              isHost={isHost}
              busy={busy}
              onNext={onNext}
            />
          )}

          {room.phase === 'finished' && (
            <GameOver
              room={room}
              language={language}
              playerId={playerId}
              isHost={isHost}
              busy={busy}
              stats={stats}
              earnedAchievements={earnedAchievements}
              onRestart={onRestart}
            />
          )}
        </div>

        <ChatPanel
          room={room}
          language={language}
          playerId={playerId}
          disabled={status !== 'connected'}
          onSendChat={onSendChat}
          onEmote={onEmote}
        />
      </div>
    </div>
  )
}
