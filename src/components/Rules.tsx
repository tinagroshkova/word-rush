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
import ui from '../styles/ui.module.scss'
import styles from './Rules.module.scss'

interface RulesProps {
  onClose: () => void
}

const EXAMPLE_LETTERS = 6
const EXAMPLE_MS_LEFT = 12_000
const EXAMPLE_LENGTH_BONUS = (EXAMPLE_LETTERS - MIN_WORD_LENGTH) * PER_LETTER_BONUS
const EXAMPLE_SPEED_BONUS = Math.round((EXAMPLE_MS_LEFT / ROUND_DURATION_MS) * MAX_SPEED_BONUS)
const EXAMPLE_TOTAL =
  BASE_POINTS + EXAMPLE_LENGTH_BONUS + EXAMPLE_SPEED_BONUS + FIRST_BLOOD_BONUS
const ROUND_SECONDS = Math.round(ROUND_DURATION_MS / 1000)

export const Rules = ({ onClose }: RulesProps) => (
  <main className={styles.page}>
    <div className={styles.top}>
      <span className={ui.eyebrow}>How to play</span>
      <button className={`${ui.button} ${ui.buttonGhost}`} onClick={onClose}>
        Back
      </button>
    </div>

    <header className={styles.hero}>
      <h1 className={styles.title}>
        Rules &amp; <span>scoring</span>
      </h1>
      <p className={styles.lede}>
        Every round gives the room a target letter combo. Find a real word that contains it, lock
        it in before the clock runs out, and score more by answering fast, answering long, and
        getting there first.
      </p>
    </header>

    <div className={styles.grid}>
      <section className={`${ui.card} ${styles.section}`}>
        <h2>The goal</h2>
        <p className={ui.muted}>
          Race the other players to the best word for each target. You can submit one word per
          round. Once you submit, you are locked in until the round ends.
        </p>
        <ol className={styles.steps}>
          <li>The host starts the match and each new round.</li>
          <li>Read the target, then type a word that contains it.</li>
          <li>Submit before the timer hits zero. Early words score more.</li>
          <li>After the final round, the highest total score wins.</li>
        </ol>
      </section>

      <section className={`${ui.card} ${styles.section}`}>
        <h2>Scoring</h2>
        <p className={ui.muted}>Points are added together for every accepted word.</p>
        <div className={styles.formula}>
          points = base + length + speed + first blood
        </div>
        <ul className={styles.scoringList}>
          <li>
            <span>Base word</span>
            <span>+{BASE_POINTS}</span>
          </li>
          <li>
            <span>Length</span>
            <span>+{PER_LETTER_BONUS} per letter above {MIN_WORD_LENGTH}</span>
          </li>
          <li>
            <span>Speed</span>
            <span>up to +{MAX_SPEED_BONUS}</span>
          </li>
          <li>
            <span>First blood</span>
            <span>+{FIRST_BLOOD_BONUS} for the first word</span>
          </li>
        </ul>
        <div className={styles.example}>
          <p className={ui.eyebrow}>Worked example</p>
          <p>
            <strong>planet</strong> is {EXAMPLE_LETTERS} letters, submitted first with 12 seconds
            left:
          </p>
          <p className={styles.exampleMath}>
            {BASE_POINTS} + {EXAMPLE_LENGTH_BONUS} + {EXAMPLE_SPEED_BONUS} +{' '}
            {FIRST_BLOOD_BONUS} = <strong>{EXAMPLE_TOTAL} pts</strong>
          </p>
        </div>
      </section>

      <section className={`${ui.card} ${styles.section}`}>
        <h2>Valid words</h2>
        <ul className={styles.bullets}>
          <li>
            Between <strong>{MIN_WORD_LENGTH}</strong> and <strong>{MAX_WORD_LENGTH}</strong>{' '}
            letters long.
          </li>
          <li>
            Must contain the round&apos;s target letters, in order. For target <strong>umb</strong>,
            words like <strong>thumb</strong> and <strong>plumber</strong> count.
          </li>
          <li>Must be a real dictionary word. Made-up words are rejected.</li>
          <li>
            A word can only be used once per match, so watch what the room has already played.
          </li>
          <li>Duplicates and late submissions do not score.</li>
        </ul>
      </section>

      <section className={`${ui.card} ${styles.section}`}>
        <h2>Match rules</h2>
        <ul className={styles.bullets}>
          <li>
            A match lasts <strong>{DEFAULT_MAX_ROUNDS} rounds</strong>, with{' '}
            <strong>{ROUND_SECONDS} seconds</strong> per round.
          </li>
          <li>The host controls starting the match, the next round, and rematches.</li>
          <li>
            Bots can fill empty seats. They use real words and compete for the same points.
          </li>
          <li>
            At the end, players are ranked by total points. Tied players share the same place.
          </li>
        </ul>
      </section>
    </div>

    <div className={styles.footer}>
      <button className={`${ui.button} ${ui.buttonPrimary}`} onClick={onClose}>
        Back to game
      </button>
    </div>
  </main>
)
