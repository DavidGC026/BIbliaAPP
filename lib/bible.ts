import { getPool } from "./mysql"
import type { Book, Verse, NoteLink, BibleVersion } from "./types"
import type { RowDataPacket, ResultSetHeader } from "mysql2"
import crypto from "crypto"

/**
 * NOTE ON SCHEMA
 * The database now includes:
 *   - users (id, name, email, password, role)
 *   - bible_books (idBook, name, testament)
 *   - bible_verses (idVerse, idBible, idBook, chapter, verse, text)
 *   - v_bible_verses (VIEW: book_id, book_name, chapter, verse, text)
 *   - bible_note_links (id, book_id, chapter, verse, note_content, user_id)
 *   - bible_notebooks (id, user_id, name)
 *   - bible_notebook_notes (id, notebook_id, title, content)
 *   - bible_devotionals (id, user_id, title, emotion, verse_ref, content)
 */

export async function ensureDbTables(): Promise<void> {
  const pool = getPool()
  
  // 1. Create users table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)

  // 2. Original notebook tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bible_notebooks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      joplin_folder_id VARCHAR(255) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
  await pool.query(`
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

  // 3. Verse note links table (local DB, not Joplin)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bible_note_links (
      id INT AUTO_INCREMENT PRIMARY KEY,
      book_id INT NOT NULL,
      chapter INT NOT NULL,
      verse INT NOT NULL,
      note_id VARCHAR(255) DEFAULT NULL,
      note_content TEXT DEFAULT NULL,
      user_id INT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_verse_user (book_id, chapter, verse, user_id),
      KEY idx_verse (book_id, chapter, verse)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)

  // Add user_id to notebooks
  try {
    await pool.query(`ALTER TABLE bible_notebooks ADD COLUMN user_id INT DEFAULT NULL`)
  } catch (_) {}

  // Migrate legacy Joplin schema → local note storage
  try {
    await pool.query(`ALTER TABLE bible_note_links ADD COLUMN user_id INT DEFAULT NULL`)
  } catch (_) {}
  try {
    await pool.query(`ALTER TABLE bible_note_links ADD COLUMN note_content TEXT DEFAULT NULL`)
  } catch (_) {}
  try {
    await pool.query(
      `ALTER TABLE bible_note_links MODIFY note_id VARCHAR(255) NULL DEFAULT NULL`,
    )
  } catch (_) {}
  // Drop old Joplin-era unique indexes
  for (const idx of ["uniq_verse_note_id", "uniq_verse_note"]) {
    try {
      await pool.query(`ALTER TABLE bible_note_links DROP INDEX ${idx}`)
    } catch (_) {}
  }
  try {
    await pool.query(
      `ALTER TABLE bible_note_links ADD UNIQUE KEY uniq_verse_user (book_id, chapter, verse, user_id)`,
    )
  } catch (_) {}

  // Create devotionals table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bible_devotionals (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      emotion VARCHAR(100) DEFAULT NULL,
      verse_ref VARCHAR(255) DEFAULT NULL,
      content JSON NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)

  // Add user allowed_sections, streak_count and last_active_date columns for user permissions and streak tracking
  try {
    await pool.query(`ALTER TABLE users ADD COLUMN allowed_sections JSON DEFAULT NULL`)
  } catch (_) {}

  try {
    await pool.query(`ALTER TABLE users ADD COLUMN streak_count INT DEFAULT 0`)
  } catch (_) {}

  try {
    await pool.query(`ALTER TABLE users ADD COLUMN last_active_date DATE DEFAULT NULL`)
  } catch (_) {}

  // Create reading plans tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bible_reading_plans (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      chapters_data JSON NOT NULL,
      duration_days INT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_reading_plans (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      plan_id INT NOT NULL,
      progress JSON NOT NULL,
      started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (plan_id) REFERENCES bible_reading_plans(id) ON DELETE CASCADE,
      UNIQUE KEY uniq_user_plan (user_id, plan_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)

  // Seed default reading plans if empty
  const [plans] = await pool.query<RowDataPacket[]>("SELECT id FROM bible_reading_plans LIMIT 1")
  if (plans.length === 0) {
    const CHAPTER_COUNTS: Record<number, number> = {
      1: 50, 2: 40, 3: 27, 4: 36, 5: 34, 6: 24, 7: 21, 8: 4, 9: 31, 10: 24,
      11: 22, 12: 25, 13: 29, 14: 36, 15: 10, 16: 13, 17: 10, 18: 42, 19: 150, 20: 31,
      21: 12, 22: 8, 23: 66, 24: 52, 25: 5, 26: 48, 27: 12, 28: 14, 29: 3, 30: 9,
      31: 1, 32: 4, 33: 7, 34: 3, 35: 3, 36: 3, 37: 2, 38: 14, 39: 4, 40: 28,
      41: 16, 42: 24, 43: 21, 44: 28, 45: 16, 46: 16, 47: 13, 48: 6, 49: 6, 50: 4,
      51: 4, 52: 5, 53: 3, 54: 6, 55: 4, 56: 3, 57: 1, 58: 13, 59: 5, 60: 5,
      61: 3, 62: 5, 63: 1, 64: 1, 65: 1, 66: 22
    };

    const BOOK_NAMES: Record<number, string> = {
      1: "Génesis", 2: "Éxodo", 3: "Levítico", 4: "Números", 5: "Deuteronomio",
      6: "Josué", 7: "Jueces", 8: "Rut", 9: "1 Samuel", 10: "2 Samuel",
      11: "1 Reyes", 12: "2 Reyes", 13: "1 Crónicas", 14: "2 Crónicas",
      15: "Esdras", 16: "Nehemías", 17: "Ester", 18: "Job", 19: "Salmos",
      20: "Proverbios", 21: "Eclesiastés", 22: "Cantares", 23: "Isaías",
      24: "Jeremías", 25: "Lamentaciones", 26: "Ezequiel", 27: "Daniel",
      28: "Oseas", 29: "Joel", 30: "Amós", 31: "Abdías", 32: "Jonás",
      33: "Miqueas", 34: "Nahúm", 35: "Habacuc", 36: "Sofonías",
      37: "Hageo", 38: "Zacarías", 39: "Malaquías", 40: "Mateo",
      41: "Marcos", 42: "Lucas", 43: "Juan", 44: "Hechos", 45: "Romanos",
      46: "1 Corintios", 47: "2 Corintios", 48: "Gálatas", 49: "Efesios",
      50: "Filipenses", 51: "Colosenses", 52: "1 Tesalonicenses",
      53: "2 Tesalonicenses", 54: "1 Timoteo", 55: "2 Timoteo",
      56: "Tito", 57: "Filemón", 58: "Hebreos", 59: "Santiago",
      60: "1 Pedro", 61: "2 Pedro", 62: "1 Juan", 63: "2 Juan",
      64: "3 Juan", 65: "Judas", 66: "Apocalipsis"
    };

    const bookOrder = [
      1, 18, 2, 3, 4, 5, 6, 7, 8, 9, 10, 13, 14, 11, 12, 19, 20, 21, 22, 31, 29, 32, 30, 28, 33, 23, 34, 36, 35, 24, 25, 26, 27, 37, 38, 17, 15, 16, 39, 40, 41, 42, 43, 44, 59, 48, 52, 53, 46, 47, 45, 50, 51, 57, 49, 54, 56, 60, 61, 55, 58, 65, 62, 63, 64, 66
    ];

    const allChapters: { bookId: number, chapter: number }[] = [];
    for (const bookId of bookOrder) {
      const chapters = CHAPTER_COUNTS[bookId] || 0;
      for (let c = 1; c <= chapters; c++) {
        allChapters.push({ bookId, chapter: c });
      }
    }

    const totalChapters = allChapters.length;
    const days = 365;
    const chaptersPerDay = Math.floor(totalChapters / days);
    const remainder = totalChapters % days;
    
    const chronoData = [];
    let currentIndex = 0;
    
    for (let day = 1; day <= days; day++) {
      const count = chaptersPerDay + (day <= remainder ? 1 : 0);
      const dayChapters = allChapters.slice(currentIndex, currentIndex + count);
      currentIndex += count;
      
      const readings: any[] = [];
      for (const ch of dayChapters) {
        let lastReading = readings[readings.length - 1];
        if (lastReading && lastReading.bookId === ch.bookId) {
          lastReading.chapters.push(ch.chapter);
        } else {
          readings.push({
            bookId: ch.bookId,
            bookName: BOOK_NAMES[ch.bookId] || "Libro",
            chapters: [ch.chapter]
          });
        }
      }
      chronoData.push({ day, readings });
    }

    await pool.query(
      `INSERT INTO bible_reading_plans (name, description, chapters_data, duration_days)
       VALUES (?, ?, ?, ?)`,
      [
        "Plan Cronológico de un Año",
        "Lee toda la Biblia en un año en orden cronológico estimado de los acontecimientos.",
        JSON.stringify(chronoData),
        365
      ]
    );

    // Proverbs 30 Days Plan
    const provData = [];
    for (let day = 1; day <= 30; day++) {
      provData.push({
        day,
        readings: [{
          bookId: 20,
          bookName: "Proverbios",
          chapters: day === 30 ? [30, 31] : [day]
        }]
      });
    }

    await pool.query(
      `INSERT INTO bible_reading_plans (name, description, chapters_data, duration_days)
       VALUES (?, ?, ?, ?)`,
      [
        "Proverbios en 30 Días",
        "Estudia sabiduría leyendo un capítulo de Proverbios al día durante un mes.",
        JSON.stringify(provData),
        30
      ]
    );
  }

  // Insert a default admin user if no users exist
  const [users] = await pool.query<RowDataPacket[]>("SELECT id FROM users LIMIT 1")
  if (users.length === 0) {
    // default password is 'admin123'
    const defaultHash = "ddc71a16e2270a159e92928b0e31c1c6e31433c07cd4701e3d4dc42591ddae22" 
    await pool.query(
      `INSERT INTO users (name, email, password, role) VALUES ('Admin', 'admin@biblia.com', ?, 'admin')`,
      [defaultHash]
    )
  }
}

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

// NOTE LINKS CRUD FOR VERSES
export async function getLinksForChapter(bookId: number, chapter: number, userId?: number): Promise<any[]> {
  await ensureDbTables()
  if (userId) {
    const [rows] = await getPool().query<RowDataPacket[]>(
      `SELECT id, book_id AS bookId, chapter, verse, note_content AS noteContent, created_at AS createdAt
       FROM bible_note_links
       WHERE book_id = ? AND chapter = ? AND user_id = ?`,
      [bookId, chapter, userId],
    )
    return rows
  } else {
    const [rows] = await getPool().query<RowDataPacket[]>(
      `SELECT id, book_id AS bookId, chapter, verse, note_content AS noteContent, created_at AS createdAt
       FROM bible_note_links
       WHERE book_id = ? AND chapter = ? AND user_id IS NULL`,
      [bookId, chapter],
    )
    return rows
  }
}

export async function createLink(
  bookId: number,
  chapter: number,
  verse: number,
  noteContent: string,
  userId?: number,
): Promise<number> {
  await ensureDbTables()
  const userVal = userId ?? null

  const [existing] = await getPool().query<RowDataPacket[]>(
    `SELECT id FROM bible_note_links
     WHERE book_id = ? AND chapter = ? AND verse = ? AND user_id <=> ?`,
    [bookId, chapter, verse, userVal],
  )
  if (existing.length > 0) {
    return existing[0].id as number
  }

  const [result] = await getPool().query<ResultSetHeader>(
    `INSERT INTO bible_note_links (book_id, chapter, verse, note_content, user_id)
     VALUES (?, ?, ?, ?, ?)`,
    [bookId, chapter, verse, noteContent, userVal],
  )
  return result.insertId
}

export async function deleteLink(id: number, userId?: number): Promise<void> {
  await ensureDbTables()
  if (userId) {
    await getPool().query(`DELETE FROM bible_note_links WHERE id = ? AND user_id = ?`, [id, userId])
  } else {
    await getPool().query(`DELETE FROM bible_note_links WHERE id = ?`, [id])
  }
}

// NOTEBOOKS CRUD
export async function listNotebooks(userId?: number): Promise<any[]> {
  await ensureDbTables()
  if (userId) {
    const [rows] = await getPool().query<RowDataPacket[]>(
      `SELECT id, name, created_at AS createdAt FROM bible_notebooks WHERE user_id = ? ORDER BY id DESC`,
      [userId]
    )
    return rows
  } else {
    const [rows] = await getPool().query<RowDataPacket[]>(
      `SELECT id, name, created_at AS createdAt FROM bible_notebooks WHERE user_id IS NULL ORDER BY id DESC`
    )
    return rows
  }
}

export async function createNotebook(name: string, userId?: number): Promise<number> {
  await ensureDbTables()
  const [result] = await getPool().query<ResultSetHeader>(
    `INSERT INTO bible_notebooks (name, user_id) VALUES (?, ?)`,
    [name, userId || null]
  )
  return result.insertId
}

export async function deleteNotebook(id: number, userId?: number): Promise<void> {
  await ensureDbTables()
  if (userId) {
    await getPool().query(`DELETE FROM bible_notebooks WHERE id = ? AND user_id = ?`, [id, userId])
  } else {
    await getPool().query(`DELETE FROM bible_notebooks WHERE id = ?`, [id])
  }
}

export async function getNotebook(id: number, userId?: number): Promise<any | null> {
  await ensureDbTables()
  const [rows] = await getPool().query<RowDataPacket[]>(
    userId
      ? `SELECT id, name FROM bible_notebooks WHERE id = ? AND user_id = ?`
      : `SELECT id, name FROM bible_notebooks WHERE id = ?`,
    userId ? [id, userId] : [id]
  )
  if (rows.length === 0) return null
  return rows[0]
}

// NOTEBOOK NOTES CRUD
export async function listNotebookNotes(notebookId: number, userId?: number): Promise<any[]> {
  await ensureDbTables()
  if (userId) {
    const [rows] = await getPool().query<RowDataPacket[]>(
      `SELECT n.id, n.notebook_id AS notebookId, n.title, n.content, n.created_at AS createdAt, n.updated_at AS updatedAt
       FROM bible_notebook_notes n
       JOIN bible_notebooks b ON n.notebook_id = b.id
       WHERE n.notebook_id = ? AND b.user_id = ?
       ORDER BY n.id DESC`,
      [notebookId, userId]
    )
    return rows
  } else {
    const [rows] = await getPool().query<RowDataPacket[]>(
      `SELECT id, notebook_id AS notebookId, title, content, created_at AS createdAt, updated_at AS updatedAt
       FROM bible_notebook_notes
       WHERE notebook_id = ?
       ORDER BY id DESC`,
      [notebookId]
    )
    return rows
  }
}

export async function createNotebookNote(notebookId: number, title: string, content: string): Promise<number> {
  await ensureDbTables()
  const [result] = await getPool().query<ResultSetHeader>(
    `INSERT INTO bible_notebook_notes (notebook_id, title, content) VALUES (?, ?, ?)`,
    [notebookId, title, content]
  )
  return result.insertId
}

export async function getNotebookNote(id: number, userId?: number): Promise<any | null> {
  await ensureDbTables()
  if (userId) {
    const [rows] = await getPool().query<RowDataPacket[]>(
      `SELECT n.id, n.notebook_id AS notebookId, n.title, n.content, n.created_at AS createdAt, n.updated_at AS updatedAt
       FROM bible_notebook_notes n
       JOIN bible_notebooks b ON n.notebook_id = b.id
       WHERE n.id = ? AND b.user_id = ?`,
      [id, userId]
    )
    if (rows.length === 0) return null
    return rows[0]
  } else {
    const [rows] = await getPool().query<RowDataPacket[]>(
      `SELECT id, notebook_id AS notebookId, title, content, created_at AS createdAt, updated_at AS updatedAt
       FROM bible_notebook_notes
       WHERE id = ?`,
      [id]
    )
    if (rows.length === 0) return null
    return rows[0]
  }
}

export async function updateNotebookNote(id: number, title: string, content: string): Promise<void> {
  await ensureDbTables()
  await getPool().query(
    `UPDATE bible_notebook_notes SET title = ?, content = ? WHERE id = ?`,
    [title, content, id]
  )
}

export async function deleteNotebookNote(id: number): Promise<void> {
  await ensureDbTables()
  await getPool().query(`DELETE FROM bible_notebook_notes WHERE id = ?`, [id])
}

// USER CRUD
export async function getUserByEmail(email: string): Promise<any | null> {
  await ensureDbTables()
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT id, name, email, password, role, allowed_sections AS allowedSections, streak_count AS streakCount, last_active_date AS lastActiveDate FROM users WHERE email = ?`,
    [email]
  )
  if (rows.length === 0) return null
  return rows[0]
}

export async function getUserById(id: number): Promise<any | null> {
  await ensureDbTables()
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT id, name, email, role, allowed_sections AS allowedSections, streak_count AS streakCount, last_active_date AS lastActiveDate FROM users WHERE id = ?`,
    [id]
  )
  if (rows.length === 0) return null
  return rows[0]
}

export async function createUser(
  name: string,
  email: string,
  passwordHash: string,
  role = "user",
  allowedSections: string[] | null = null
): Promise<number> {
  await ensureDbTables()
  const allowedVal = allowedSections ? JSON.stringify(allowedSections) : null
  const [result] = await getPool().query<ResultSetHeader>(
    `INSERT INTO users (name, email, password, role, allowed_sections) VALUES (?, ?, ?, ?, ?)`,
    [name, email, passwordHash, role, allowedVal]
  )
  return result.insertId
}

export async function listUsers(): Promise<any[]> {
  await ensureDbTables()
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT id, name, email, role, allowed_sections AS allowedSections, created_at AS createdAt FROM users ORDER BY id DESC`
  )
  return rows
}

export async function deleteUser(id: number): Promise<void> {
  await ensureDbTables()
  await getPool().query(`DELETE FROM users WHERE id = ?`, [id])
}

export async function updateUserAdmin(
  id: number,
  name: string,
  email: string,
  passwordHash: string | null,
  role: string,
  allowedSections: string[] | null
): Promise<void> {
  await ensureDbTables()
  const allowedVal = allowedSections ? JSON.stringify(allowedSections) : null
  if (passwordHash) {
    await getPool().query(
      `UPDATE users SET name = ?, email = ?, password = ?, role = ?, allowed_sections = ? WHERE id = ?`,
      [name, email, passwordHash, role, allowedVal, id]
    )
  } else {
    await getPool().query(
      `UPDATE users SET name = ?, email = ?, role = ?, allowed_sections = ? WHERE id = ?`,
      [name, email, role, allowedVal, id]
    )
  }
}

export async function updateUserStreak(userId: number): Promise<void> {
  await ensureDbTables()
  const pool = getPool()
  
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT streak_count, last_active_date FROM users WHERE id = ?`,
    [userId]
  )
  if (rows.length === 0) return

  const user = rows[0]
  const today = new Date()
  // Generate timezone offset safe local date string: YYYY-MM-DD
  const offset = today.getTimezoneOffset()
  const localToday = new Date(today.getTime() - (offset * 60 * 1000))
  const todayStr = localToday.toISOString().split("T")[0]

  if (user.last_active_date) {
    let lastActiveStr = ""
    if (user.last_active_date instanceof Date) {
      lastActiveStr = user.last_active_date.toISOString().split("T")[0]
    } else if (typeof user.last_active_date === "string") {
      lastActiveStr = user.last_active_date.split("T")[0]
    }

    if (lastActiveStr) {
      const d1 = new Date(todayStr + "T00:00:00Z")
      const d2 = new Date(lastActiveStr + "T00:00:00Z")
      const diffDays = Math.round((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24))
      
      if (diffDays === 1) {
        // Active yesterday: increment streak!
        await pool.query(
          `UPDATE users SET streak_count = streak_count + 1, last_active_date = ? WHERE id = ?`,
          [todayStr, userId]
        )
      } else if (diffDays > 1) {
        // Missed a day: reset streak to 1
        await pool.query(
          `UPDATE users SET streak_count = 1, last_active_date = ? WHERE id = ?`,
          [todayStr, userId]
        )
      }
    } else {
      // Fallback
      await pool.query(
        `UPDATE users SET streak_count = 1, last_active_date = ? WHERE id = ?`,
        [todayStr, userId]
      )
    }
  } else {
    // First active day: set streak to 1
    await pool.query(
      `UPDATE users SET streak_count = 1, last_active_date = ? WHERE id = ?`,
      [todayStr, userId]
    )
  }
}

// READING PLANS HELPERS
export async function listReadingPlans(): Promise<any[]> {
  await ensureDbTables()
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT id, name, description, chapters_data AS chaptersData, duration_days AS durationDays FROM bible_reading_plans`
  )
  return rows
}

export async function getUserReadingPlans(userId: number): Promise<any[]> {
  await ensureDbTables()
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT urp.id, urp.plan_id AS planId, urp.progress, urp.started_at AS startedAt, 
            brp.name, brp.description, brp.chapters_data AS chaptersData, brp.duration_days AS durationDays
     FROM user_reading_plans urp
     JOIN bible_reading_plans brp ON urp.plan_id = brp.id
     WHERE urp.user_id = ?`,
    [userId]
  )
  return rows
}

export async function joinReadingPlan(userId: number, planId: number): Promise<void> {
  await ensureDbTables()
  await getPool().query(
    `INSERT INTO user_reading_plans (user_id, plan_id, progress) VALUES (?, ?, '[]')
     ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP`,
    [userId, planId]
  )
}

export async function updateReadingPlanProgress(userId: number, planId: number, progressDays: number[]): Promise<void> {
  await ensureDbTables()
  await getPool().query(
    `UPDATE user_reading_plans SET progress = ? WHERE user_id = ? AND plan_id = ?`,
    [JSON.stringify(progressDays), userId, planId]
  )
}

// DEVOTIONALS / DIARIO ESPIRITUAL
function parseJsonField<T = Record<string, unknown>>(value: unknown, fallback: T): T {
  if (value == null) return fallback
  if (typeof value === "object") return value as T
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T
    } catch {
      return fallback
    }
  }
  return fallback
}

export async function listDevotionals(userId: number): Promise<any[]> {
  await ensureDbTables()
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT id, title, emotion, verse_ref AS verseRef, content, created_at AS createdAt
     FROM bible_devotionals
     WHERE user_id = ?
     ORDER BY id DESC`,
    [userId]
  )
  return rows.map((row) => ({
    ...row,
    content: parseJsonField(row.content, { reflection: "", application: "" }),
  }))
}

export async function createDevotional(
  userId: number,
  title: string,
  emotion: string | null,
  verseRef: string | null,
  content: any
): Promise<number> {
  await ensureDbTables()
  const [result] = await getPool().query<ResultSetHeader>(
    `INSERT INTO bible_devotionals (user_id, title, emotion, verse_ref, content)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, title, emotion, verseRef, JSON.stringify(content)]
  )
  return result.insertId
}

export async function updateDevotional(
  id: number,
  userId: number,
  title: string,
  emotion: string | null,
  verseRef: string | null,
  content: any
): Promise<void> {
  await ensureDbTables()
  await getPool().query(
    `UPDATE bible_devotionals
     SET title = ?, emotion = ?, verse_ref = ?, content = ?
     WHERE id = ? AND user_id = ?`,
    [title, emotion, verseRef, JSON.stringify(content), id, userId]
  )
}

export async function deleteDevotional(id: number, userId: number): Promise<void> {
  await ensureDbTables()
  await getPool().query(
    `DELETE FROM bible_devotionals WHERE id = ? AND user_id = ?`,
    [id, userId]
  )
}

// JOPLIN DEPRECATED SYNC STUBS (to prevent compilation failures in untouched files)
export async function getSyncCursor(token: string): Promise<string> {
  return ""
}
export async function setSyncCursor(token: string, cursor: string): Promise<void> {}
export async function findNotebookByJoplinId(joplinFolderId: string): Promise<any | null> {
  return null
}
export async function findNoteByJoplinId(joplinNoteId: string): Promise<any | null> {
  return null
}
export async function upsertNotebook(name: string, joplinFolderId: string): Promise<number> {
  return 0
}
export async function upsertNotebookNote(notebookId: number, title: string, content: string, joplinNoteId: string): Promise<number> {
  return 0
}
export async function deleteNotebookByJoplinId(joplinFolderId: string): Promise<void> {}
export async function deleteNotebookNoteByJoplinId(joplinNoteId: string): Promise<void> {}

// BIBLE SEARCH
export async function searchVerses(bibleId: number, query: string, limit = 100): Promise<Verse[]> {
  const term = `%${query}%`
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT bv.idVerse AS id, bv.idBook AS bookId, bb.name AS bookName,
            bv.chapter, bv.verse, bv.text
     FROM bible_verses bv
     JOIN bible_books bb ON bv.idBook = bb.idBook
     WHERE bv.idBible = ? AND (bv.text LIKE ? OR bb.name LIKE ?)
     ORDER BY bv.idBook, bv.chapter, bv.verse
     LIMIT ?`,
    [bibleId, term, term, limit],
  )
  return rows as Verse[]
}

export async function updateAllReadersPermissions(allowedSections: string[]): Promise<number> {
  await ensureDbTables()
  const allowedVal = JSON.stringify(allowedSections)
  const [result] = await getPool().query<ResultSetHeader>(
    `UPDATE users SET allowed_sections = ? WHERE role = 'user'`,
    [allowedVal]
  )
  return result.affectedRows
}
