import type { ResultSetHeader, RowDataPacket } from "mysql2/promise"
import { getPool } from "./mysql"
import { runOnce } from "./once-async"
import { DEFAULT_CONTENT, createDailyChallenge, gameDay, parseGameContent, passageKey, type DailyChallenge, type GameContent } from "./games/catalog"

export class GameContentError extends Error {
  constructor(message: string, public status: number) { super(message) }
}
export function ensureGameContentTables() {
  return runOnce("game-content-v1", async () => {
    const pool = getPool()
    await pool.query(`CREATE TABLE IF NOT EXISTS bible_game_content (
      id TINYINT PRIMARY KEY, revision INT NOT NULL DEFAULT 1, catalog LONGTEXT NOT NULL,
      updated_by INT NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)
    await pool.query(`CREATE TABLE IF NOT EXISTS bible_game_daily (
      day CHAR(10) PRIMARY KEY, challenge LONGTEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)
    await pool.query("INSERT IGNORE INTO bible_game_content (id, catalog) VALUES (1, ?)", [JSON.stringify(DEFAULT_CONTENT)])
  })
}
export async function getGameContent(): Promise<{ revision: number; catalog: GameContent }> {
  await ensureGameContentTables()
  const [rows] = await getPool().query<RowDataPacket[]>("SELECT revision, catalog FROM bible_game_content WHERE id = 1")
  return { revision: Number(rows[0].revision), catalog: parseGameContent(JSON.parse(rows[0].catalog)) }
}
export async function getDailyChallenge(date = gameDay()): Promise<DailyChallenge> {
  await ensureGameContentTables()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > gameDay()) throw new GameContentError("El reto de esa fecha no está disponible.", 404)
  const pool = getPool()
  let [rows] = await pool.query<RowDataPacket[]>("SELECT challenge FROM bible_game_daily WHERE day = ?", [date])
  if (!rows.length && date === gameDay()) {
    const { catalog } = await getGameContent()
    await pool.query("INSERT IGNORE INTO bible_game_daily (day, challenge) VALUES (?, ?)", [date, JSON.stringify(createDailyChallenge(catalog, date))])
    ;[rows] = await pool.query<RowDataPacket[]>("SELECT challenge FROM bible_game_daily WHERE day = ?", [date])
  }
  if (!rows.length) throw new GameContentError("Este reto ya no está disponible. Vuelve a los juegos y actualiza el reto diario.", 404)
  return JSON.parse(rows[0].challenge) as DailyChallenge
}
export async function saveGameContent(value: unknown, revision: unknown, userId: number) {
  let catalog: GameContent
  try { catalog = parseGameContent(value) } catch (error) { throw new GameContentError((error as Error).message, 400) }
  if (!Number.isSafeInteger(revision) || Number(revision) < 1) throw new GameContentError("Recarga el catálogo antes de publicar.", 400)
  await ensureGameContentTables()
  const references = [...new Map([...catalog.words, ...catalog.pairs, ...catalog.passages].map(passage => [passageKey(passage), passage])).values()]
  const [found] = await getPool().query<RowDataPacket[]>(
    `SELECT DISTINCT idBook AS bookId, chapter, verse FROM bible_verses WHERE (idBook, chapter, verse) IN (${references.map(() => "(?, ?, ?)").join(",")})`,
    references.flatMap(passage => [passage.bookId, passage.chapter, passage.verse]),
  )
  const existing = new Set(found.map(row => passageKey({ bookId: row.bookId, chapter: row.chapter, verse: row.verse })))
  if (references.some(passage => !existing.has(passageKey(passage)))) throw new GameContentError("Uno de los pasajes no existe en las Biblias disponibles. Revisa el libro, capítulo y versículo.", 400)
  const [saved] = await getPool().query<ResultSetHeader>(
    "UPDATE bible_game_content SET catalog = ?, revision = revision + 1, updated_by = ? WHERE id = 1 AND revision = ?",
    [JSON.stringify(catalog), userId, revision],
  )
  if (!saved.affectedRows) throw new GameContentError("Otro administrador actualizó el catálogo. Recarga el catálogo y revisa tu entrada antes de publicar.", 409)
  return { revision: Number(revision) + 1, catalog }
}
