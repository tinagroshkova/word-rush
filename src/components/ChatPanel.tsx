import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { ActionResult } from '../../shared/events'
import { translate, type MessageKey, type MessageVars } from '../../shared/i18n'
import type { LanguageCode } from '../../shared/languages'
import type { RoomState } from '../../shared/types'
import ui from '../styles/ui.module.scss'
import styles from './ChatPanel.module.scss'

const EMOTES = ['🔥', '😂', '👏', '😱', '💪', '🎯', '❤️', '👀'] as const
const MAX_CHAT_LENGTH = 160

interface ChatPanelProps {
  room: RoomState
  language: LanguageCode
  playerId: string
  disabled: boolean
  onSendChat: (text: string) => Promise<ActionResult>
  onEmote: (emoji: string) => void
}

export const ChatPanel = ({
  room,
  language,
  playerId,
  disabled,
  onSendChat,
  onEmote,
}: ChatPanelProps) => {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<HTMLUListElement | null>(null)
  const t = (key: MessageKey, vars?: MessageVars) => translate(language, key, vars)

  useEffect(() => {
    const list = listRef.current
    if (list) {
      list.scrollTop = list.scrollHeight
    }
  }, [room.chat.length])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    const value = text.trim()
    if (value.length === 0 || sending) {
      return
    }

    setSending(true)
    setError(null)
    const result = await onSendChat(value)
    setSending(false)

    if (result.ok) {
      setText('')
    } else {
      setError(result.error ?? t('error.actionUnavailable'))
    }
  }

  return (
    <section className={`${ui.card} ${styles.chat}`} aria-label={t('chat.title')}>
      <div className={ui.cardHead}>
        <h2>{t('chat.title')}</h2>
        <span className={ui.pill}>{room.chat.length}</span>
      </div>

      <ul className={styles.messages} ref={listRef}>
        {room.chat.length === 0 ? (
          <li className={`${ui.muted} ${styles.empty}`}>{t('chat.empty')}</li>
        ) : (
          room.chat.map((message) => (
            <li key={message.id} className={styles.message}>
              <span className={styles.author}>
                {message.playerName}
                {message.playerId === playerId && (
                  <span className={`${ui.tag} ${ui.tagYou}`}>{t('common.you')}</span>
                )}
              </span>
              <span className={styles.text}>{message.text}</span>
              <time className={styles.time} dateTime={new Date(message.at).toISOString()}>
                {new Date(message.at).toLocaleTimeString(language, {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </time>
            </li>
          ))
        )}
      </ul>

      <div className={styles.emotes}>
        {EMOTES.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className={styles.emoteButton}
            onClick={() => onEmote(emoji)}
            disabled={disabled}
            aria-label={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={t('chat.placeholder')}
          maxLength={MAX_CHAT_LENGTH}
          autoComplete="off"
          aria-label={t('chat.placeholder')}
          disabled={disabled || sending}
        />
        <button
          className={`${ui.button} ${ui.buttonPrimary}`}
          type="submit"
          disabled={disabled || sending || text.trim().length === 0}
        >
          {t('chat.send')}
        </button>
      </form>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
