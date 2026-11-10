import { useEffect, useState } from 'react'
import {
  DIFFICULTIES,
  GAME_MODES,
  MAX_ROUNDS,
  MAX_ROUND_DURATION_MS,
  MAX_WORD_LENGTH_SETTING,
  MIN_ROUNDS,
  MIN_ROUND_DURATION_MS,
  MIN_WORD_LENGTH_SETTING,
  MODE_DURATIONS,
} from '../../shared/game'
import { translate, type MessageKey, type MessageVars } from '../../shared/i18n'
import type { LanguageCode } from '../../shared/languages'
import type {
  Difficulty,
  GameMode,
  RoomSettings,
  RoomState,
} from '../../shared/types'
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
  onUpdateSettings: (settings: Partial<RoomSettings>) => Promise<boolean>
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
  onUpdateSettings,
}: LobbyProps) => {
  const humanCount = room.players.filter((player) => !player.isBot && player.connected).length
  const botCount = room.players.filter((player) => player.isBot).length
  const soloStart = humanCount === 1 && botCount === 0
  const me = room.players.find((player) => player.id === playerId)
  const t = (key: MessageKey, vars?: MessageVars) => translate(language, key, vars)

  const [draft, setDraft] = useState<RoomSettings>(room.settings)

  useEffect(() => {
    setDraft(room.settings)
  }, [room.settings])

  const modeLabel = (mode: GameMode) => t(`mode.${mode}` as MessageKey)
  const modeDesc = (mode: GameMode) => t(`mode.${mode}Desc` as MessageKey)
  const difficultyLabel = (difficulty: Difficulty) =>
    t(`difficulty.${difficulty}` as MessageKey)
  const difficultyDesc = (difficulty: Difficulty) =>
    t(`difficulty.${difficulty}Desc` as MessageKey)

  const handleMode = (mode: GameMode) => {
    setDraft((current) => ({
      ...current,
      mode,
      roundDurationMs: MODE_DURATIONS[mode],
    }))
  }

  const draftSettings = (): Partial<RoomSettings> => ({
    mode: draft.mode,
    maxRounds: draft.maxRounds,
    roundDurationMs: draft.roundDurationMs,
    minWordLength: draft.minWordLength,
    difficulty: draft.difficulty,
  })

  const dirty = JSON.stringify(draft) !== JSON.stringify(room.settings)

  const handleSave = () => {
    void onUpdateSettings(draftSettings())
  }

  const handleStart = async () => {
    if (dirty) {
      const saved = await onUpdateSettings(draftSettings())
      if (!saved) {
        return
      }
    }
    onStart()
  }

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
            <strong>{Math.round(room.settings.roundDurationMs / 1000)}s</strong>
            <span>{t('common.perRound')}</span>
          </li>
          <li>
            <strong>{modeLabel(room.settings.mode)}</strong>
            <span>{t('common.mode')}</span>
          </li>
          <li>
            <strong>{room.players.filter((player) => player.connected).length}</strong>
            <span>{t('common.ready')}</span>
          </li>
        </ul>

        {room.daily && (
          <p className={`${ui.muted} ${ui.small}`}>{t('lobby.dailyNote')}</p>
        )}

        {me?.spectator && (
          <p className={ui.waiting}>{t('lobby.spectatorNote')}</p>
        )}

        <div className={styles.settings}>
          <div className={styles.settingsHead}>
            <strong>{t('lobby.settings')}</strong>
            {!isHost && <span className={ui.muted}>{t('lobby.settingsHost')}</span>}
          </div>

          <div className={styles.settingsGrid}>
            <label className={ui.field}>
              <span className={ui.fieldLabel}>{t('lobby.mode')}</span>
              <select
                value={draft.mode}
                onChange={(event) => handleMode(event.target.value as GameMode)}
                disabled={!isHost || busy}
              >
                {GAME_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {modeLabel(mode)}
                  </option>
                ))}
              </select>
              <span className={`${ui.muted} ${ui.small}`}>{modeDesc(draft.mode)}</span>
            </label>

            <label className={ui.field}>
              <span className={ui.fieldLabel}>{t('lobby.difficulty')}</span>
              <select
                value={draft.difficulty}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    difficulty: event.target.value as Difficulty,
                  }))
                }
                disabled={!isHost || busy}
              >
                {DIFFICULTIES.map((difficulty) => (
                  <option key={difficulty} value={difficulty}>
                    {difficultyLabel(difficulty)}
                  </option>
                ))}
              </select>
              <span className={`${ui.muted} ${ui.small}`}>
                {difficultyDesc(draft.difficulty)}
              </span>
            </label>

            <label className={ui.field}>
              <span className={ui.fieldLabel}>{t('lobby.rounds')}</span>
              <input
                type="number"
                min={MIN_ROUNDS}
                max={MAX_ROUNDS}
                value={draft.maxRounds}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    maxRounds: Number(event.target.value),
                  }))
                }
                disabled={!isHost || busy}
              />
            </label>

            <label className={ui.field}>
              <span className={ui.fieldLabel}>{t('lobby.roundTime')}</span>
              <input
                type="number"
                min={MIN_ROUND_DURATION_MS / 1000}
                max={MAX_ROUND_DURATION_MS / 1000}
                step={1}
                value={Math.round(draft.roundDurationMs / 1000)}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    roundDurationMs: Number(event.target.value) * 1000,
                  }))
                }
                disabled={!isHost || busy}
              />
            </label>

            <label className={ui.field}>
              <span className={ui.fieldLabel}>{t('lobby.minLength')}</span>
              <input
                type="number"
                min={MIN_WORD_LENGTH_SETTING}
                max={MAX_WORD_LENGTH_SETTING}
                value={draft.minWordLength}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    minWordLength: Number(event.target.value),
                  }))
                }
                disabled={!isHost || busy}
              />
            </label>
          </div>

          {isHost && (
            <button
              className={`${ui.button} ${styles.saveButton}`}
              onClick={handleSave}
              disabled={busy || !dirty}
            >
              {t('lobby.saveSettings')}
            </button>
          )}
        </div>

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
            onClick={() => void handleStart()}
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
