import type { CSSProperties } from "react";
import {
  ordinal,
  translate,
  type MessageKey,
  type MessageVars,
} from "../../shared/i18n";
import type { LanguageCode } from "../../shared/languages";
import type { Player, RoomState } from "../../shared/types";
import type { AchievementId, PlayerStats } from "../storage";
import ui from "../styles/ui.module.scss";
import styles from "./GameOver.module.scss";

const ACHIEVEMENTS: readonly AchievementId[] = [
  "firstWin",
  "streak3",
  "streak5",
  "rare",
  "long",
  "daily",
];

const CONFETTI_COLORS = [
  "var(--gold)",
  "var(--accent)",
  "var(--accent-2)",
  "var(--success)",
] as const;

const CONFETTI = Array.from({ length: 30 }, (_, index) => ({
  left: `${(index * 37) % 100}%`,
  delay: `${(index % 8) * 0.12}s`,
  duration: `${2.6 + (index % 5) * 0.3}s`,
  drift: `${((index * 17) % 90) - 45}px`,
  spin: `${360 + (index % 5) * 180}deg`,
  color: CONFETTI_COLORS[index % CONFETTI_COLORS.length] ?? "var(--gold)",
  size: `${5 + (index % 3) * 2}px`,
  round: index % 3 === 0,
}));

const TrophyIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className={styles.trophy}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M8 4h8v4a4 4 0 0 1-8 0V4Z" />
    <path d="M8 5H5v2a3 3 0 0 0 3 3" />
    <path d="M16 5h3v2a3 3 0 0 1-3 3" />
    <path d="M12 12v4" />
    <path d="M10 16h4l1 4H9l1-4Z" />
    <path d="M9 20h6" />
  </svg>
);

interface GameOverProps {
  room: RoomState;
  language: LanguageCode;
  playerId: string;
  isHost: boolean;
  busy: boolean;
  stats: PlayerStats;
  earnedAchievements: AchievementId[];
  onRestart: () => void;
}

interface Standing {
  player: Player;
  place: number;
}

const buildStandings = (players: Player[]): Standing[] =>
  players.reduce<Standing[]>((rows, player, index) => {
    const previous = rows[index - 1];
    const place =
      previous && previous.player.score === player.score
        ? previous.place
        : index + 1;
    rows.push({ player, place });
    return rows;
  }, []);

const placeClass = (place: number): string | undefined =>
  place === 1
    ? styles.row1
    : place === 2
      ? styles.row2
      : place === 3
        ? styles.row3
        : "";

export const GameOver = ({
  room,
  language,
  playerId,
  isHost,
  busy,
  stats,
  earnedAchievements,
  onRestart,
}: GameOverProps) => {
  const standings = buildStandings(room.players);
  const me = room.players.find((player) => player.id === playerId);
  const isSpectator = me?.spectator ?? false;
  const winners = standings.filter((standing) => standing.place === 1);
  const t = (key: MessageKey, vars?: MessageVars) =>
    translate(language, key, vars);
  const champion =
    winners.length > 1
      ? t("over.tie", {
          names: winners.map((winner) => winner.player.name).join(", "),
        })
      : t("over.winner", { name: winners[0]?.player.name ?? t("over.nobody") });

  return (
    <main className={`${ui.layout} ${ui.layoutResults}`}>
      <section
        className={`${ui.card} ${ui.cardWide} ${ui.results} ${styles.gameOver}`}
      >
        <div className={styles.confetti} aria-hidden="true">
          {CONFETTI.map((piece, index) => (
            <span
              key={index}
              className={styles.confettiPiece}
              style={
                {
                  left: piece.left,
                  animationDelay: piece.delay,
                  animationDuration: piece.duration,
                  "--drift": piece.drift,
                  "--spin": piece.spin,
                  "--confetti-color": piece.color,
                  "--confetti-size": piece.size,
                  "--confetti-radius": piece.round ? "50%" : "2px",
                } as CSSProperties
              }
            />
          ))}
        </div>

        <div className={`${ui.cardHead} ${styles.head}`}>
          <div>
            <h2>{t("over.title")}</h2>
            <div className={styles.championRow}>
              <TrophyIcon />
              <p className={styles.champion}>{champion}</p>
            </div>
          </div>
          <span className={ui.pill}>
            {t("over.rounds", { count: room.maxRounds })}
          </span>
        </div>

        <ol className={styles.standings}>
          {standings.map(({ player, place }, index) => (
            <li
              key={player.id}
              className={[
                styles.row,
                placeClass(place),
                player.id === playerId ? styles.isYou : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <span className={styles.place}>{ordinal(language, place)}</span>
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
                {player.id === playerId && (
                  <span className={`${ui.tag} ${ui.tagYou}`}>
                    {t("common.you")}
                  </span>
                )}
              </span>
              <span className={styles.points}>
                {player.score}
                <span className={styles.unit}>{t("common.pts")}</span>
              </span>
            </li>
          ))}
        </ol>

        {!isSpectator && (
          <div className={styles.statsSection}>
            <h3>{t("over.stats")}</h3>
            <dl className={styles.statsGrid}>
              <div>
                <dt>{t("over.games")}</dt>
                <dd>{stats.games}</dd>
              </div>
              <div>
                <dt>{t("over.wins")}</dt>
                <dd>{stats.wins}</dd>
              </div>
              <div>
                <dt>{t("over.bestScore")}</dt>
                <dd>{stats.bestScore}</dd>
              </div>
              <div>
                <dt>{t("over.bestWord")}</dt>
                <dd>{stats.bestWord || t("results.none")}</dd>
              </div>
              <div>
                <dt>{t("over.bestStreak")}</dt>
                <dd>{stats.bestStreak}</dd>
              </div>
            </dl>
          </div>
        )}

        <div className={styles.statsSection}>
          <h3>{t("over.achievements")}</h3>
          <ul className={styles.achievements}>
            {ACHIEVEMENTS.map((id) => {
              const earned = stats.achievements.includes(id);
              const fresh = earnedAchievements.includes(id);
              return (
                <li
                  key={id}
                  className={[
                    styles.achievement,
                    earned ? styles.achievementEarned : "",
                    fresh ? styles.achievementFresh : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span className={styles.achievementDot} aria-hidden="true" />
                  {t(`over.ach.${id}` as MessageKey)}
                </li>
              );
            })}
          </ul>
        </div>

        {isHost ? (
          <button
            className={`${ui.button} ${ui.buttonPrimary}`}
            onClick={onRestart}
            disabled={busy}
          >
            {busy ? t("over.restarting") : t("over.playAgain")}
          </button>
        ) : (
          <p className={ui.waiting}>{t("over.waitingHost")}</p>
        )}
      </section>
    </main>
  );
};
