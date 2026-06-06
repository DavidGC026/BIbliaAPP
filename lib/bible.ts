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

export async function ensureNotebookTables(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS bible_notebooks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS bible_notebook_notes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      notebook_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      joplin_note_id VARCHAR(255) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (notebook_id) REFERENCES bible_notebooks(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
  // Migration to add joplin_note_id to existing table if needed
  try {
    await getPool().query(`ALTER TABLE bible_notebook_notes ADD COLUMN joplin_note_id VARCHAR(255) DEFAULT NULL`)
  } catch (_) {
    // Column already exists
  }
}

export async function listNotebooks(): Promise<any[]> {
  await ensureNotebookTables()
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT id, name, created_at AS createdAt FROM bible_notebooks ORDER BY id DESC`
  )
  return rows
}

export async function createNotebook(name: string): Promise<number> {
  await ensureNotebookTables()
  const [result] = await getPool().query<ResultSetHeader>(
    `INSERT INTO bible_notebooks (name) VALUES (?)`,
    [name]
  )
  return result.insertId
}

export async function deleteNotebook(id: number): Promise<void> {
  await ensureNotebookTables()
  await getPool().query(`DELETE FROM bible_notebooks WHERE id = ?`, [id])
}

export async function listNotebookNotes(notebookId: number): Promise<any[]> {
  await ensureNotebookTables()
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT id, notebook_id AS notebookId, title, content, joplin_note_id AS joplinNoteId, created_at AS createdAt, updated_at AS updatedAt
     FROM bible_notebook_notes
     WHERE notebook_id = ?
     ORDER BY id DESC`,
    [notebookId]
  )
  return rows
}

export async function createNotebookNote(notebookId: number, title: string, content: string, joplinNoteId: string | null = null): Promise<number> {
  await ensureNotebookTables()
  const [result] = await getPool().query<ResultSetHeader>(
    `INSERT INTO bible_notebook_notes (notebook_id, title, content, joplin_note_id) VALUES (?, ?, ?, ?)`,
    [notebookId, title, content, joplinNoteId]
  )
  return result.insertId
}

export async function getNotebookNote(id: number): Promise<any | null> {
  await ensureNotebookTables()
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT id, notebook_id AS notebookId, title, content, joplin_note_id AS joplinNoteId, created_at AS createdAt, updated_at AS updatedAt
     FROM bible_notebook_notes
     WHERE id = ?`,
    [id]
  )
  if (rows.length === 0) return null
  return rows[0]
}

export async function updateNotebookNote(id: number, title: string, content: string, joplinNoteId: string | null = null): Promise<void> {
  await ensureNotebookTables()
  await getPool().query(
    `UPDATE bible_notebook_notes SET title = ?, content = ?, joplin_note_id = ? WHERE id = ?`,
    [title, content, joplinNoteId, id]
  )
}

export async function deleteNotebookNote(id: number): Promise<void> {
  await ensureNotebookTables()
  await getPool().query(`DELETE FROM bible_notebook_notes WHERE id = ?`, [id])
}
