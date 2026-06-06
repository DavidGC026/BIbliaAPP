import { getPool } from "./mysql"
import type { Book, Verse, NoteLink } from "./types"
import type { RowDataPacket, ResultSetHeader } from "mysql2"

/**
 * NOTE ON SCHEMA
 * The app expects a `bible_verses` table with these columns:
 *   id, book_id, book_name, chapter, verse, text
 * If your `bible.sql` dump uses different column names, adjust the SELECTs below
 * (this is the single place to remap them).
 */

export async function listBooks(): Promise<Book[]> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT book_id AS bookId, book_name AS bookName, MAX(chapter) AS chapters
     FROM bible_verses
     GROUP BY book_id, book_name
     ORDER BY book_id`,
  )
  return rows as Book[]
}

export async function getVerses(bookId: number, chapter: number): Promise<Verse[]> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT id, book_id AS bookId, book_name AS bookName, chapter, verse, text
     FROM bible_verses
     WHERE book_id = ? AND chapter = ?
     ORDER BY verse`,
    [bookId, chapter],
  )
  return rows as Verse[]
}

export async function ensureLinksTable(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS bible_note_links (
      id INT AUTO_INCREMENT PRIMARY KEY,
      book_id INT NOT NULL,
      chapter INT NOT NULL,
      verse INT NOT NULL,
      joplin_note_id VARCHAR(64) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_verse_note (book_id, chapter, verse, joplin_note_id),
      KEY idx_verse (book_id, chapter, verse)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
}

export async function getLinksForChapter(bookId: number, chapter: number): Promise<NoteLink[]> {
  await ensureLinksTable()
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT id, book_id AS bookId, chapter, verse, joplin_note_id AS joplinNoteId, created_at AS createdAt
     FROM bible_note_links
     WHERE book_id = ? AND chapter = ?`,
    [bookId, chapter],
  )
  return rows as NoteLink[]
}

export async function createLink(
  bookId: number,
  chapter: number,
  verse: number,
  joplinNoteId: string,
): Promise<void> {
  await ensureLinksTable()
  await getPool().query<ResultSetHeader>(
    `INSERT IGNORE INTO bible_note_links (book_id, chapter, verse, joplin_note_id)
     VALUES (?, ?, ?, ?)`,
    [bookId, chapter, verse, joplinNoteId],
  )
}

export async function deleteLink(id: number): Promise<void> {
  await getPool().query<ResultSetHeader>(`DELETE FROM bible_note_links WHERE id = ?`, [id])
}
