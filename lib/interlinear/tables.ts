import { getPool } from "../mysql"
import { runOnce } from "../once-async"

/**
 * Tablas del interlineal. DDL canónico en scripts/004_interlinear.sql.
 * verse = 0 son títulos de salmo; no coinciden con un verso de bible_verses.
 */
export async function ensureInterlinearTables(): Promise<void> {
  return runOnce("ensureInterlinearTables", _ensureInterlinearTables)
}

async function _ensureInterlinearTables(): Promise<void> {
  const pool = getPool()

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bible_interlinear (
      id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
      idBook       SMALLINT UNSIGNED NOT NULL,
      chapter      SMALLINT UNSIGNED NOT NULL,
      verse        SMALLINT UNSIGNED NOT NULL,
      position     SMALLINT UNSIGNED NOT NULL,
      original     VARCHAR(120) NOT NULL,
      transliteration VARCHAR(120)  NULL,
      strong_code  VARCHAR(12)  NULL,
      strong_raw   VARCHAR(80)   NULL,
      morph        VARCHAR(40)   NULL,
      lemma        VARCHAR(120)  NULL,
      gloss_es     VARCHAR(255)  NULL,
      gloss_en     VARCHAR(255)  NULL,
      language     ENUM('grc','heb','arc') NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uq_word (idBook, chapter, verse, position),
      KEY idx_passage (idBook, chapter, verse),
      KEY idx_strong (strong_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bible_strong_particles (
      strong_code  VARCHAR(12) NOT NULL,
      gloss_en     VARCHAR(120) NOT NULL,
      gloss_es     VARCHAR(120) NOT NULL,
      description_es TEXT NULL,
      PRIMARY KEY (strong_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
}
