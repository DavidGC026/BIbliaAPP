import { getUserByEmail, transferNotebooksFromUser } from "@/lib/bible"
import { verifyPassword } from "@/lib/auth"
import { getPool } from "@/lib/mysql"
import type { RowDataPacket } from "mysql2"

export const TRANSFER_CATEGORIES = [
  "notebooks",
  "devotionals",
  "highlights",
  "verseNotes",
  "readingPlans",
] as const

export type TransferCategory = (typeof TRANSFER_CATEGORIES)[number]

export interface TransferPreview {
  sourceUserId: number
  sourceEmail: string
  sourceName: string
  counts: Record<TransferCategory, number>
}

export interface TransferResult {
  transferred: Partial<Record<TransferCategory, number>>
  move: boolean
}

async function ensureHighlightsTable(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS bible_verse_highlights (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL DEFAULT 0,
      book_id INT NOT NULL,
      chapter INT NOT NULL,
      verse INT NOT NULL,
      bible_id INT NOT NULL DEFAULT 1,
      color VARCHAR(50) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_verse_user_bible_highlight (user_id, book_id, chapter, verse, bible_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
}

export class SameAccountTransferError extends Error {
  code = "SAME_ACCOUNT" as const
  constructor() {
    super(
      "Este correo ya es tu cuenta actual. Si entras con Google usando el mismo correo, accedes a los mismos datos (libretas, subrayados, etc.).",
    )
    this.name = "SameAccountTransferError"
  }
}

export async function verifyTransferSourceAccount(
  email: string,
  password: string,
  targetUserId: number,
): Promise<{ id: number; email: string; name: string }> {
  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail || !password) {
    throw new Error("Correo y contraseña de la cuenta anterior son obligatorios.")
  }

  const user = await getUserByEmail(normalizedEmail)
  if (!user) {
    throw new Error("No encontramos una cuenta con ese correo.")
  }
  if (user.id === targetUserId) {
    throw new SameAccountTransferError()
  }
  if (!verifyPassword(password, user.password)) {
    throw new Error("Contraseña incorrecta para la cuenta anterior.")
  }

  return { id: user.id, email: user.email, name: user.name }
}

export async function getAccountTransferPreview(sourceUserId: number): Promise<Record<TransferCategory, number>> {
  await ensureHighlightsTable()
  const pool = getPool()

  const [notebookRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS cnt FROM bible_notebooks WHERE user_id = ?`,
    [sourceUserId],
  )
  const [devotionalRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS cnt FROM bible_devotionals WHERE user_id = ?`,
    [sourceUserId],
  )
  const [highlightRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS cnt FROM bible_verse_highlights WHERE user_id = ?`,
    [sourceUserId],
  )
  const [verseNoteRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS cnt FROM bible_note_links WHERE user_id = ?`,
    [sourceUserId],
  )
  const [planRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS cnt FROM user_reading_plans WHERE user_id = ?`,
    [sourceUserId],
  )

  return {
    notebooks: Number(notebookRows[0]?.cnt ?? 0),
    devotionals: Number(devotionalRows[0]?.cnt ?? 0),
    highlights: Number(highlightRows[0]?.cnt ?? 0),
    verseNotes: Number(verseNoteRows[0]?.cnt ?? 0),
    readingPlans: Number(planRows[0]?.cnt ?? 0),
  }
}

export async function getAccountTransferPreviewDetailed(sourceUserId: number) {
  const counts = await getAccountTransferPreview(sourceUserId)
  const pool = getPool()
  const [noteRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS cnt
     FROM bible_notebook_notes n
     JOIN bible_notebooks b ON n.notebook_id = b.id
     WHERE b.user_id = ?`,
    [sourceUserId],
  )
  return {
    counts,
    notebookNotes: Number(noteRows[0]?.cnt ?? 0),
  }
}

async function transferDevotionals(
  sourceUserId: number,
  targetUserId: number,
  move: boolean,
): Promise<number> {
  const pool = getPool()
  if (move) {
    const [result] = await pool.query(
      `UPDATE bible_devotionals SET user_id = ? WHERE user_id = ?`,
      [targetUserId, sourceUserId],
    )
    return (result as { affectedRows?: number }).affectedRows ?? 0
  }

  const [result] = await pool.query(
    `INSERT INTO bible_devotionals (user_id, title, emotion, verse_ref, content)
     SELECT ?, title, emotion, verse_ref, content
     FROM bible_devotionals
     WHERE user_id = ?`,
    [targetUserId, sourceUserId],
  )
  return (result as { affectedRows?: number }).affectedRows ?? 0
}

async function transferHighlights(
  sourceUserId: number,
  targetUserId: number,
  move: boolean,
): Promise<number> {
  await ensureHighlightsTable()
  const pool = getPool()

  if (move) {
    await pool.query(
      `DELETE t FROM bible_verse_highlights t
       INNER JOIN bible_verse_highlights s
         ON t.book_id = s.book_id
        AND t.chapter = s.chapter
        AND t.verse = s.verse
        AND t.bible_id = s.bible_id
       WHERE t.user_id = ? AND s.user_id = ?`,
      [targetUserId, sourceUserId],
    )
    const [result] = await pool.query(
      `UPDATE bible_verse_highlights SET user_id = ? WHERE user_id = ?`,
      [targetUserId, sourceUserId],
    )
    return (result as { affectedRows?: number }).affectedRows ?? 0
  }

  const [result] = await pool.query(
    `INSERT INTO bible_verse_highlights (user_id, book_id, chapter, verse, bible_id, color)
     SELECT ?, book_id, chapter, verse, bible_id, color
     FROM bible_verse_highlights
     WHERE user_id = ?
     ON DUPLICATE KEY UPDATE color = VALUES(color)`,
    [targetUserId, sourceUserId],
  )
  return (result as { affectedRows?: number }).affectedRows ?? 0
}

async function transferVerseNotes(
  sourceUserId: number,
  targetUserId: number,
  move: boolean,
): Promise<number> {
  const pool = getPool()

  if (move) {
    await pool.query(
      `DELETE t FROM bible_note_links t
       INNER JOIN bible_note_links s
         ON t.book_id = s.book_id
        AND t.chapter = s.chapter
        AND t.verse = s.verse
       WHERE t.user_id = ? AND s.user_id = ?`,
      [targetUserId, sourceUserId],
    )
    const [result] = await pool.query(
      `UPDATE bible_note_links SET user_id = ? WHERE user_id = ?`,
      [targetUserId, sourceUserId],
    )
    return (result as { affectedRows?: number }).affectedRows ?? 0
  }

  const [result] = await pool.query(
    `INSERT INTO bible_note_links (book_id, chapter, verse, note_content, user_id)
     SELECT book_id, chapter, verse, note_content, ?
     FROM bible_note_links
     WHERE user_id = ?
     ON DUPLICATE KEY UPDATE note_content = VALUES(note_content)`,
    [targetUserId, sourceUserId],
  )
  return (result as { affectedRows?: number }).affectedRows ?? 0
}

async function transferReadingPlans(
  sourceUserId: number,
  targetUserId: number,
  move: boolean,
): Promise<number> {
  const pool = getPool()

  if (move) {
    await pool.query(
      `DELETE t FROM user_reading_plans t
       INNER JOIN user_reading_plans s ON t.plan_id = s.plan_id
       WHERE t.user_id = ? AND s.user_id = ?`,
      [targetUserId, sourceUserId],
    )
    const [result] = await pool.query(
      `UPDATE user_reading_plans SET user_id = ? WHERE user_id = ?`,
      [targetUserId, sourceUserId],
    )
    return (result as { affectedRows?: number }).affectedRows ?? 0
  }

  const [result] = await pool.query(
    `INSERT INTO user_reading_plans (user_id, plan_id, progress, started_at)
     SELECT ?, plan_id, progress, started_at
     FROM user_reading_plans
     WHERE user_id = ?
     ON DUPLICATE KEY UPDATE progress = VALUES(progress)`,
    [targetUserId, sourceUserId],
  )
  return (result as { affectedRows?: number }).affectedRows ?? 0
}

export async function transferAccountData(
  sourceUserId: number,
  targetUserId: number,
  options: { move: boolean; categories: TransferCategory[] },
): Promise<TransferResult> {
  if (sourceUserId === targetUserId) {
    throw new Error("La cuenta origen y destino son la misma.")
  }

  const categories = new Set(options.categories)
  const transferred: Partial<Record<TransferCategory, number>> = {}

  if (categories.has("notebooks")) {
    const result = await transferNotebooksFromUser(sourceUserId, targetUserId, {
      move: options.move,
    })
    transferred.notebooks = result.notebooks
  }
  if (categories.has("devotionals")) {
    transferred.devotionals = await transferDevotionals(sourceUserId, targetUserId, options.move)
  }
  if (categories.has("highlights")) {
    transferred.highlights = await transferHighlights(sourceUserId, targetUserId, options.move)
  }
  if (categories.has("verseNotes")) {
    transferred.verseNotes = await transferVerseNotes(sourceUserId, targetUserId, options.move)
  }
  if (categories.has("readingPlans")) {
    transferred.readingPlans = await transferReadingPlans(sourceUserId, targetUserId, options.move)
  }

  return { transferred, move: options.move }
}
