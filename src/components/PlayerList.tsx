import {
  translate,
  type MessageKey,
  type MessageVars,
} from "../../shared/i18n";
import type { LanguageCode } from "../../shared/languages";
import type { Player } from "../../shared/types";
import ui from "../styles/ui.module.scss";
import styles from "./PlayerList.module.scss";

interface PlayerListProps {
  players: Player[];
  playerId: string;
  language: LanguageCode;
  title: string;
  showScores?: boolean;
  showSubmitted?: boolean;
  onRemoveBot?: (botId: string) => void;
}

export const PlayerList = ({
  players,
  playerId,
  language,
  title,
  showScores = true,
  showSubmitted = false,
  onRemoveBot,
}: PlayerListProps) => {
  const t = (key: MessageKey, vars?: MessageVars) =>
    translate(language, key, vars);

  return (
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
              player.id === playerId ? styles.isYou : "",
              player.connected ? "" : styles.isOffline,
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span className={styles.rank}>
              {showScores ? index + 1 : <span className={styles.dot} />}
            </span>
            <span className={styles.name}>
              {player.name}
              {player.isHost && (
                <span className={ui.tag}>{t("common.host")}</span>
              )}
              {player.isBot && (
                <span className={`${ui.tag} ${ui.tagBot}`}>
                  {t("common.bot")}
                </span>
              )}
              {player.isBot && player.personality && (
                <span className={ui.tag}>
                  {t(`bot.${player.personality}` as MessageKey)}
                </span>
              )}
              {player.spectator && (
                <span className={ui.tag}>{t("common.spectating")}</span>
              )}
              {player.streak > 1 && (
                <span className={`${ui.tag} ${styles.streak}`}>
                  {t("play.streak", { count: player.streak })}
                </span>
              )}
              {player.id === playerId && (
                <span className={`${ui.tag} ${ui.tagYou}`}>
                  {t("common.you")}
                </span>
              )}
              {!player.connected && (
                <span className={`${ui.tag} ${ui.tagOffline}`}>
                  {t("common.offline")}
                </span>
              )}
            </span>
            {showSubmitted && (
              <span
                className={`${styles.check} ${player.submitted ? styles.isDone : ""}`}
              >
                {player.submitted ? t("common.locked") : t("common.thinking")}
              </span>
            )}
            {showScores && <span className={styles.score}>{player.score}</span>}
            {onRemoveBot && player.isBot && (
              <button
                className={styles.remove}
                onClick={() => onRemoveBot(player.id)}
                title={t("common.remove", { name: player.name })}
                aria-label={t("common.remove", { name: player.name })}
              >
                <span className={styles.removeIcon} aria-hidden="true">
                  ×
                </span>
              </button>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
};
