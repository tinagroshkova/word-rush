import { translate, type MessageKey } from "../../shared/i18n";
import { LANGUAGES, type LanguageCode } from "../../shared/languages";
import type { Theme } from "../storage";
import ui from "../styles/ui.module.scss";
import styles from "./AppHeader.module.scss";

interface AppHeaderProps {
  language: LanguageCode;
  theme: Theme;
  onLanguageChange: (language: LanguageCode) => void;
  onToggleTheme: () => void;
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

export const AppHeader = ({
  language,
  theme,
  onLanguageChange,
  onToggleTheme,
}: AppHeaderProps) => {
  const t = (key: MessageKey) => translate(language, key);
  const themeLabel =
    theme === "dark" ? t("header.switchToLight") : t("header.switchToDark");

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
