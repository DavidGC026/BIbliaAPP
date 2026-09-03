import type { ResultSetHeader, RowDataPacket } from "mysql2"

import { getPool } from "../mysql"
import { runOnce } from "../once-async"

export interface InterlinearWord {
  idBook: number
  chapter: number
  verse: number
  position: number
  original: string
  transliteration: string | null
  strongCode: string | null
  strongRaw: string | null
  morph: string | null
  lemma: string | null
  glossEs: string | null
  glossEn: string | null
  language: "grc" | "heb" | "arc"
}

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

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS n FROM bible_interlinear`,
  )
  if (Number(countRows[0]?.n ?? 0) > 0) {
    await pool.query(`UPDATE bible_bibles SET fuertes = 1 WHERE fuertes IS NULL OR fuertes = 0`)
  }
}

const INSERT_SQL = `
  INSERT INTO bible_interlinear
    (idBook, chapter, verse, position, original, transliteration,
     strong_code, strong_raw, morph, lemma, gloss_es, gloss_en, language)
  VALUES ?
  ON DUPLICATE KEY UPDATE
    original = VALUES(original),
    transliteration = VALUES(transliteration),
    strong_code = VALUES(strong_code),
    strong_raw = VALUES(strong_raw),
    morph = VALUES(morph),
    lemma = VALUES(lemma),
    gloss_es = VALUES(gloss_es),
    gloss_en = VALUES(gloss_en),
    language = VALUES(language)
`

export async function upsertInterlinearWords(words: InterlinearWord[]): Promise<void> {
  if (words.length === 0) return
  const values = words.map((word) => [
    word.idBook,
    word.chapter,
    word.verse,
    word.position,
    word.original,
    word.transliteration,
    word.strongCode,
    word.strongRaw,
    word.morph,
    word.lemma,
    word.glossEs,
    word.glossEn,
    word.language,
  ])
  await getPool().query(INSERT_SQL, [values])
}

export async function deleteInterlinearByLanguage(language: InterlinearWord["language"]): Promise<number> {
  const [result] = await getPool().query<ResultSetHeader>(
    `DELETE FROM bible_interlinear WHERE language = ?`,
    [language],
  )
  return Number(result.affectedRows ?? 0)
}
