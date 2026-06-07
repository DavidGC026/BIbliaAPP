import { getPool } from "./mysql"
import type { Book, Verse, NoteLink, BibleVersion } from "./types"
import type { RowDataPacket, ResultSetHeader } from "mysql2"
import crypto from "crypto"

/**
 * NOTE ON SCHEMA
 * The database has:
 *   - bible_books (idBook, name, testament)
 *   - bible_verses (idVerse, idBible, idBook, chapter, verse, text)
 *   - v_bible_verses (VIEW: book_id, book_name, chapter, verse, text)
 *   - bible_note_links (id, book_id, chapter, verse, note_id, created_at, updated_at)
 */

export async function listBibles(): Promise<BibleVersion[]> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT idBible AS bibleId, abreviation AS abbr, name
     FROM bible_bibles
     ORDER BY idBible`,
  )
  return rows as BibleVersion[]
}

export async function listBooks(bibleId: number): Promise<Book[]> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT bb.idBook AS bookId, bb.name AS bookName,
            (SELECT MAX(bv.chapter) FROM bible_verses bv WHERE bv.idBook = bb.idBook AND bv.idBible = ?) AS chapters
     FROM bible_books bb
     WHERE EXISTS (
       SELECT 1 FROM bible_verses bv
       WHERE bv.idBook = bb.idBook AND bv.idBible = ?
     )
     ORDER BY bb.idBook`,
    [bibleId, bibleId],
  )
  return rows as Book[]
}

export async function getVerses(bibleId: number, bookId: number, chapter: number): Promise<Verse[]> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT bv.idVerse AS id, bv.idBook AS bookId, bb.name AS bookName,
            bv.chapter, bv.verse, bv.text
     FROM bible_verses bv
     JOIN bible_books bb ON bv.idBook = bb.idBook
     WHERE bv.idBible = ? AND bv.idBook = ? AND bv.chapter = ?
     ORDER BY bv.verse`,
    [bibleId, bookId, chapter],
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
      joplin_folder_id VARCHAR(255) DEFAULT NULL,
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
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS bible_sync_state (
      token_hash VARCHAR(64) PRIMARY KEY,
      last_cursor VARCHAR(255) NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
  // Migrations for existing tables
  try {
    await getPool().query(`ALTER TABLE bible_notebooks ADD COLUMN joplin_folder_id VARCHAR(255) DEFAULT NULL`)
  } catch (_) {
    // Column already exists
  }
  try {
    await getPool().query(`ALTER TABLE bible_notebook_notes ADD COLUMN joplin_note_id VARCHAR(255) DEFAULT NULL`)
  } catch (_) {
    // Column already exists
  }
}

export async function listNotebooks(): Promise<any[]> {
  await ensureNotebookTables()
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT id, name, joplin_folder_id AS joplinFolderId, created_at AS createdAt FROM bible_notebooks ORDER BY id DESC`
  )
  return rows
}

export async function createNotebook(name: string, joplinFolderId: string | null = null): Promise<number> {
  await ensureNotebookTables()
  const [result] = await getPool().query<ResultSetHeader>(
    `INSERT INTO bible_notebooks (name, joplin_folder_id) VALUES (?, ?)`,
    [name, joplinFolderId]
  )
  return result.insertId
}

export async function deleteNotebook(id: number): Promise<void> {
  await ensureNotebookTables()
  await getPool().query(`DELETE FROM bible_notebooks WHERE id = ?`, [id])
}

export async function getNotebook(id: number): Promise<any | null> {
  await ensureNotebookTables()
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT id, name, joplin_folder_id AS joplinFolderId FROM bible_notebooks WHERE id = ?`,
    [id]
  )
  if (rows.length === 0) return null
  return rows[0]
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
    [notebookId, title, "", joplinNoteId]
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
    [title, "", joplinNoteId, id]
  )
}

export async function deleteNotebookNote(id: number): Promise<void> {
  await ensureNotebookTables()
  await getPool().query(`DELETE FROM bible_notebook_notes WHERE id = ?`, [id])
}

// Hashing function for sync state
function getTokenHash(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex")
}

export async function getSyncCursor(token: string): Promise<string> {
  await ensureNotebookTables()
  const hash = getTokenHash(token)
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT last_cursor AS lastCursor FROM bible_sync_state WHERE token_hash = ?`,
    [hash]
  )
  if (rows.length === 0) return ""
  return rows[0].lastCursor
}

export async function setSyncCursor(token: string, cursor: string): Promise<void> {
  await ensureNotebookTables()
  const hash = getTokenHash(token)
  await getPool().query(
    `INSERT INTO bible_sync_state (token_hash, last_cursor) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE last_cursor = ?`,
    [hash, cursor, cursor]
  )
}

export async function findNotebookByJoplinId(joplinFolderId: string): Promise<any | null> {
  await ensureNotebookTables()
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT id, name FROM bible_notebooks WHERE joplin_folder_id = ?`,
    [joplinFolderId]
  )
  if (rows.length === 0) return null
  return rows[0]
}

export async function findNoteByJoplinId(joplinNoteId: string): Promise<any | null> {
  await ensureNotebookTables()
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT id, notebook_id AS notebookId, title, content FROM bible_notebook_notes WHERE joplin_note_id = ?`,
    [joplinNoteId]
  )
  if (rows.length === 0) return null
  return rows[0]
}

export async function upsertNotebook(name: string, joplinFolderId: string): Promise<number> {
  await ensureNotebookTables()
  const existing = await findNotebookByJoplinId(joplinFolderId)
  if (existing) {
    await getPool().query(
      `UPDATE bible_notebooks SET name = ? WHERE id = ?`,
      [name, existing.id]
    )
    return existing.id
  } else {
    const [result] = await getPool().query<ResultSetHeader>(
      `INSERT INTO bible_notebooks (name, joplin_folder_id) VALUES (?, ?)`,
      [name, joplinFolderId]
    )
    return result.insertId
  }
}

export async function upsertNotebookNote(notebookId: number, title: string, content: string, joplinNoteId: string): Promise<number> {
  await ensureNotebookTables()
  const existing = await findNoteByJoplinId(joplinNoteId)
  if (existing) {
    await getPool().query(
      `UPDATE bible_notebook_notes SET notebook_id = ?, title = ?, content = ? WHERE id = ?`,
      [notebookId, title, "", existing.id]
    )
    return existing.id
  } else {
    const [result] = await getPool().query<ResultSetHeader>(
      `INSERT INTO bible_notebook_notes (notebook_id, title, content, joplin_note_id) VALUES (?, ?, ?, ?)`,
      [notebookId, title, "", joplinNoteId]
    )
    return result.insertId
  }
}

export async function deleteNotebookByJoplinId(joplinFolderId: string): Promise<void> {
  await ensureNotebookTables()
  await getPool().query(`DELETE FROM bible_notebooks WHERE joplin_folder_id = ?`, [joplinFolderId])
}

export async function deleteNotebookNoteByJoplinId(joplinNoteId: string): Promise<void> {
  await ensureNotebookTables()
  await getPool().query(`DELETE FROM bible_notebook_notes WHERE joplin_note_id = ?`, [joplinNoteId])
}

export async function searchVerses(bibleId: number, query: string, limit = 100): Promise<Verse[]> {
  const term = `%${query}%`
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT bv.idVerse AS id, bv.idBook AS bookId, bb.name AS bookName,
            bv.chapter, bv.verse, bv.text
     FROM bible_verses bv
     JOIN bible_books bb ON bv.idBook = bb.idBook
     WHERE bv.idBible = ? AND bv.text LIKE ?
     ORDER BY bv.idBook, bv.chapter, bv.verse
     LIMIT ?`,
    [bibleId, term, limit],
  )
  return rows as Verse[]
}
