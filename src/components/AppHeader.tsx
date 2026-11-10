import { translate, type MessageKey } from "../../shared/i18n";
import { LANGUAGES, type LanguageCode } from "../../shared/languages";
import type { Theme } from "../storage";
import ui from "../styles/ui.module.scss";
import styles from "./AppHeader.module.scss";

interface AppHeaderProps {
  language: LanguageCode;
  theme: Theme;
  soundOn: boolean;
  onLanguageChange: (language: LanguageCode) => void;
  onToggleTheme: () => void;
  onToggleSound: () => void;
}

const SunIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </svg>
);

const MoonIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const SoundIcon = ({ muted }: { muted: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M11 5 6 9H3v6h3l5 4V5Z" />
    {muted ? (
      <path d="m16 9 5 6M21 9l-5 6" />
    ) : (
      <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
    )}
  </svg>
);

export const AppHeader = ({
  language,
  theme,
  soundOn,
  onLanguageChange,
  onToggleTheme,
  onToggleSound,
}: AppHeaderProps) => {
  const t = (key: MessageKey) => translate(language, key);
  const themeLabel =
    theme === "dark" ? t("header.switchToLight") : t("header.switchToDark");
  const soundLabel = soundOn ? t("header.soundOn") : t("header.soundOff");

  return (
    <header className={styles.header}>
      <div className={styles.controls}>
        <div
          className={styles.langSwitch}
          role="group"
          aria-label={t("header.language")}
        >
          {LANGUAGES.map((option) => (
            <button
              key={option.code}
              type="button"
              className={`${styles.langButton} ${
                language === option.code ? styles.langActive : ""
              }`}
              onClick={() => onLanguageChange(option.code)}
              aria-pressed={language === option.code}
              title={option.nativeLabel}
            >
              {option.code.toUpperCase()}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={styles.themeButton}
          onClick={onToggleSound}
          title={soundLabel}
          aria-label={soundLabel}
          aria-pressed={soundOn}
        >
          <SoundIcon muted={!soundOn} />
        </button>
        <button
          type="button"
          className={styles.themeButton}
          onClick={onToggleTheme}
          title={themeLabel}
          aria-label={themeLabel}
        >
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
    </header>
  );
};
