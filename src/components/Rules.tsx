import {
  BASE_POINTS,
  DEFAULT_MAX_ROUNDS,
  FIRST_BLOOD_BONUS,
  MAX_SPEED_BONUS,
  MAX_WORD_LENGTH,
  MIN_WORD_LENGTH,
  PER_LETTER_BONUS,
  ROUND_DURATION_MS,
} from '../../shared/game'
import { translate, type MessageKey, type MessageVars } from '../../shared/i18n'
import type { LanguageCode } from '../../shared/languages'
import ui from '../styles/ui.module.scss'
import styles from './Rules.module.scss'

interface RulesProps {
  language: LanguageCode
  onClose: () => void
}

const EXAMPLE_MS_LEFT = 12_000
const ROUND_SECONDS = Math.round(ROUND_DURATION_MS / 1000)

export const Rules = ({ language, onClose }: RulesProps) => {
  const t = (key: MessageKey, vars?: MessageVars) => translate(language, key, vars)
  const workedWord = t('rules.workedWord')
  const exampleLetters = workedWord.length
  const exampleLengthBonus = (exampleLetters - MIN_WORD_LENGTH) * PER_LETTER_BONUS
  const exampleSpeedBonus = Math.round((EXAMPLE_MS_LEFT / ROUND_DURATION_MS) * MAX_SPEED_BONUS)
  const exampleTotal =
    BASE_POINTS + exampleLengthBonus + exampleSpeedBonus + FIRST_BLOOD_BONUS

  return (
    <main className={styles.page}>
      <div className={styles.top}>
        <span className={ui.eyebrow}>{t('rules.eyebrow')}</span>
        <button className={`${ui.button} ${ui.buttonGhost}`} onClick={onClose}>
          {t('common.back')}
        </button>
      </div>

      <header className={styles.hero}>
        <h1 className={styles.title}>
          {t('rules.title')} <span>{t('rules.titleHighlight')}</span>
        </h1>
        <p className={styles.lede}>{t('rules.lede')}</p>
      </header>

      <div className={styles.grid}>
        <section className={`${ui.card} ${styles.section}`}>
          <h2>{t('rules.goalTitle')}</h2>
          <p className={ui.muted}>{t('rules.goalText')}</p>
          <ol className={styles.steps}>
            <li>{t('rules.step1')}</li>
            <li>{t('rules.step2')}</li>
            <li>{t('rules.step3')}</li>
            <li>{t('rules.step4')}</li>
          </ol>
        </section>

        <section className={`${ui.card} ${styles.section}`}>
          <h2>{t('rules.scoringTitle')}</h2>
          <p className={ui.muted}>{t('rules.scoringText')}</p>
          <div className={styles.formula}>{t('rules.formula')}</div>
          <ul className={styles.scoringList}>
            <li>
              <span>{t('rules.baseWord')}</span>
              <span>+{BASE_POINTS}</span>
            </li>
            <li>
              <span>{t('rules.length')}</span>
              <span>{t('rules.lengthValue', { points: PER_LETTER_BONUS, min: MIN_WORD_LENGTH })}</span>
            </li>
            <li>
              <span>{t('rules.speed')}</span>
              <span>{t('rules.speedValue', { points: MAX_SPEED_BONUS })}</span>
            </li>
            <li>
              <span>{t('rules.firstBlood')}</span>
              <span>{t('rules.firstBloodValue', { points: FIRST_BLOOD_BONUS })}</span>
            </li>
          </ul>
          <div className={styles.example}>
            <p className={ui.eyebrow}>{t('rules.exampleEyebrow')}</p>
            <p>
              {t('rules.exampleIntro', {
                word: workedWord,
                letters: exampleLetters,
              })}
            </p>
            <p className={styles.exampleMath}>
              {BASE_POINTS} + {exampleLengthBonus} + {exampleSpeedBonus} +{' '}
              {FIRST_BLOOD_BONUS} ={' '}
              <strong>
                {exampleTotal} {t('common.pts')}
              </strong>
            </p>
          </div>
        </section>

        <section className={`${ui.card} ${styles.section}`}>
          <h2>{t('rules.validTitle')}</h2>
          <ul className={styles.bullets}>
            <li>{t('rules.valid1', { min: MIN_WORD_LENGTH, max: MAX_WORD_LENGTH })}</li>
            <li>
              {t('rules.valid2', {
                target: t('rules.exampleTarget'),
                example1: t('rules.exampleWord1'),
                example2: t('rules.exampleWord2'),
              })}
            </li>
            <li>{t('rules.valid3')}</li>
            <li>{t('rules.valid4')}</li>
            <li>{t('rules.valid5')}</li>
          </ul>
        </section>

        <section className={`${ui.card} ${styles.section}`}>
          <h2>{t('rules.matchTitle')}</h2>
          <ul className={styles.bullets}>
            <li>{t('rules.match1', { rounds: DEFAULT_MAX_ROUNDS, seconds: ROUND_SECONDS })}</li>
            <li>{t('rules.match2')}</li>
            <li>{t('rules.match3')}</li>
            <li>{t('rules.match4')}</li>
          </ul>
        </section>
      </div>

      <div className={styles.footer}>
        <button className={`${ui.button} ${ui.buttonPrimary}`} onClick={onClose}>
          {t('common.backToGame')}
        </button>
      </div>
    </main>
  )
}
