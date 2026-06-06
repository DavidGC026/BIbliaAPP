import { getPool } from "./mysql"
import type { Book, Verse, NoteLink } from "./types"
import type { RowDataPacket, ResultSetHeader } from "mysql2"

/**
 * NOTE ON SCHEMA
 * The database has:
 *   - bible_books (idBook, name, testament)
 *   - bible_verses (idVerse, idBible, idBook, chapter, verse, text)
 *   - v_bible_verses (VIEW: book_id, book_name, chapter, verse, text)
 *   - bible_note_links (id, book_id, chapter, verse, note_id, created_at, updated_at)
 */

export async function listBooks(): Promise<Book[]> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT bb.idBook AS bookId, bb.name AS bookName,
            (SELECT MAX(bv.chapter) FROM bible_verses bv WHERE bv.idBook = bb.idBook) AS chapters
     FROM bible_books bb
     ORDER BY bb.idBook`,
  )
  return rows as Book[]
}

export async function getVerses(bookId: number, chapter: number): Promise<Verse[]> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT bv.idVerse AS id, bv.idBook AS bookId, bb.name AS bookName,
            bv.chapter, bv.verse, bv.text
     FROM bible_verses bv
     JOIN bible_books bb ON bv.idBook = bb.idBook
     WHERE bv.idBook = ? AND bv.chapter = ?
     ORDER BY bv.verse`,
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
      note_id VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_verse_note (book_id, chapter, verse, note_id),
      KEY idx_verse (book_id, chapter, verse)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
}

export async function getLinksForChapter(bookId: number, chapter: number): Promise<NoteLink[]> {
  await ensureLinksTable()
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT id, book_id AS bookId, chapter, verse, note_id AS joplinNoteId, created_at AS createdAt
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
    `INSERT IGNORE INTO bible_note_links (book_id, chapter, verse, note_id)
     VALUES (?, ?, ?, ?)`,
    [bookId, chapter, verse, joplinNoteId],
  )
}

export async function deleteLink(id: number): Promise<void> {
  await getPool().query<ResultSetHeader>(`DELETE FROM bible_note_links WHERE id = ?`, [id])
}
