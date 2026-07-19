import Database from "@tauri-apps/plugin-sql";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bibles (
  bible_id INTEGER PRIMARY KEY NOT NULL,
  abbr TEXT NOT NULL,
  name TEXT NOT NULL,
  capabilities_json TEXT,
  downloaded INTEGER NOT NULL DEFAULT 0,
  downloaded_at TEXT
);

CREATE TABLE IF NOT EXISTS books (
  bible_id INTEGER NOT NULL,
  book_id INTEGER NOT NULL,
  book_name TEXT NOT NULL,
  chapters INTEGER NOT NULL,
  PRIMARY KEY (bible_id, book_id)
);

CREATE TABLE IF NOT EXISTS verses (
  bible_id INTEGER NOT NULL,
  book_id INTEGER NOT NULL,
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  id INTEGER,
  text TEXT NOT NULL,
  PRIMARY KEY (bible_id, book_id, chapter, verse)
);

CREATE TABLE IF NOT EXISTS notebooks (
  id INTEGER PRIMARY KEY NOT NULL,
  server_id INTEGER,
  name TEXT NOT NULL,
  cover_image TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  dirty INTEGER NOT NULL DEFAULT 0,
  deleted INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY NOT NULL,
  server_id INTEGER,
  notebook_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  dirty INTEGER NOT NULL DEFAULT 0,
  deleted INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS highlights (
  id INTEGER PRIMARY KEY NOT NULL,
  server_id INTEGER,
  bible_id INTEGER NOT NULL,
  book_id INTEGER NOT NULL,
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  color TEXT NOT NULL,
  created_at TEXT,
  dirty INTEGER NOT NULL DEFAULT 0,
  deleted INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS favorites (
  id INTEGER PRIMARY KEY NOT NULL,
  server_id INTEGER,
  bible_id INTEGER NOT NULL,
  book_id INTEGER NOT NULL,
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  verse_text TEXT,
  book_name TEXT,
  created_at TEXT,
  dirty INTEGER NOT NULL DEFAULT 0,
  deleted INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS verse_notes (
  id INTEGER PRIMARY KEY NOT NULL,
  server_id INTEGER,
  book_id INTEGER NOT NULL,
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  note_content TEXT,
  created_at TEXT,
  dirty INTEGER NOT NULL DEFAULT 0,
  deleted INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_verses_lookup ON verses(bible_id, book_id, chapter);
CREATE INDEX IF NOT EXISTS idx_verses_text ON verses(bible_id, text);
CREATE INDEX IF NOT EXISTS idx_notes_notebook ON notes(notebook_id);
CREATE INDEX IF NOT EXISTS idx_highlights_chapter ON highlights(bible_id, book_id, chapter);
CREATE INDEX IF NOT EXISTS idx_favorites_chapter ON favorites(bible_id, book_id, chapter);
CREATE INDEX IF NOT EXISTS idx_verse_notes_chapter ON verse_notes(book_id, chapter);
`;

let dbReady: Promise<Database> | null = null;

export function isSqliteAvailable(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function getDb(): Promise<Database> {
  if (!isSqliteAvailable()) {
    throw new Error("SQLite solo está disponible en la app de escritorio.");
  }
  if (!dbReady) {
    dbReady = Database.load("sqlite:bibliaapp.db").then(async (db) => {
      for (const stmt of SCHEMA.split(";")
        .map((s) => s.trim())
        .filter(Boolean)) {
        await db.execute(stmt);
      }
      await db
        .execute("ALTER TABLE bibles ADD COLUMN capabilities_json TEXT")
        .catch(() => {});
      return db;
    });
  }
  return dbReady;
}

export async function run(sql: string, params: unknown[] = []) {
  const db = await getDb();
  return db.execute(sql, params);
}

export async function getFirst<T>(
  sql: string,
  params: unknown[] = [],
): Promise<T | null> {
  const db = await getDb();
  const rows = await db.select<T[]>(sql, params);
  return rows[0] ?? null;
}

export async function getAll<T>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const db = await getDb();
  return db.select<T[]>(sql, params);
}

export async function getMeta(key: string): Promise<string | null> {
  const row = await getFirst<{ value: string }>(
    "SELECT value FROM meta WHERE key = ?",
    [key],
  );
  return row?.value ?? null;
}

export async function setMeta(key: string, value: string) {
  await run("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)", [
    key,
    value,
  ]);
}

export function tempId() {
  return -Math.abs(Date.now());
}

export function nowIso() {
  return new Date().toISOString();
}
