import * as api from "@/lib/api";
import { getIsOnline } from "@/lib/network";
import { isSqliteAvailable, nowIso } from "@/lib/offline/db";
import {
  cacheBibleCatalog,
  cacheBooks,
  cacheChapterVerses,
  deleteDownloadedBible,
  downloadBible,
  getDownloadedSize,
  getLocalBooks,
  getLocalVerses,
  isBibleDownloaded,
  listLocalBibles,
  searchLocalVerses,
  type DownloadProgress,
} from "@/lib/offline/bibleStore";
import {
  createLocalNotebook,
  createLocalNote,
  deleteLocalNotebook,
  deleteLocalNote,
  evictNotebook,
  evictNote,
  getLocalNote,
  listLocalNotebooks,
  listLocalNotes,
  resolveNotebookLocalId,
  updateLocalNotebook,
  updateLocalNote,
  upsertNoteFromServer,
  upsertNotebookFromServer,
} from "@/lib/offline/notesStore";
import {
  addLocalFavorite,
  getLocalChapterFavorites,
  getLocalChapterNotes,
  getLocalHighlights,
  removeLocalFavorite,
  saveLocalVerseNote,
  setLocalHighlight,
  upsertFavoritesFromServer,
  upsertHighlightsFromServer,
  upsertVerseNotesFromServer,
} from "@/lib/offline/readerStore";
import { syncAll } from "@/lib/sync";
import type { BibleVersion, Book, Notebook, NotebookNote, Verse } from "@/lib/types";

export {
  downloadBible,
  deleteDownloadedBible,
  getDownloadedSize,
  listLocalBibles,
  isBibleDownloaded,
};
export type { DownloadProgress };

function useRemote(): boolean {
  return getIsOnline() && !!api.getApiToken();
}

async function tryCache(task: () => Promise<void>) {
  try {
    await task();
  } catch {
    // ponytail: caché SQLite opcional; no bloquear lectura online
  }
}

async function localBooksIfReady(bibleId: number): Promise<Book[] | null> {
  if (!isSqliteAvailable()) return null;
  try {
    if (!(await isBibleDownloaded(bibleId))) return null;
    const books = await getLocalBooks(bibleId);
    return books.length > 0 ? books : null;
  } catch {
    return null;
  }
}

async function localVersesIfReady(
  bibleId: number,
  bookId: number,
  chapter: number,
): Promise<Verse[] | null> {
  if (!isSqliteAvailable()) return null;
  try {
    if (!(await isBibleDownloaded(bibleId))) return null;
    const verses = await getLocalVerses(bibleId, bookId, chapter);
    return verses.length > 0 ? verses : null;
  } catch {
    return null;
  }
}

async function cacheNotebooksFromServer(notebooks: Notebook[]) {
  for (const nb of notebooks) await upsertNotebookFromServer(nb);
}

async function cacheNotesFromServer(notes: NotebookNote[]) {
  for (const n of notes) await upsertNoteFromServer(n);
}

export async function initOffline() {
  if (!isSqliteAvailable()) return;
  try {
    const { getDb } = await import("@/lib/offline/db");
    await getDb();
  } catch {
    // ponytail: SQLite opcional; no bloquear lectura online
  }
}

export async function repoListBibles(): Promise<{ bibles: BibleVersion[] }> {
  if (getIsOnline()) {
    try {
      const res = await api.listBibles();
      if (isSqliteAvailable()) {
        await tryCache(() => cacheBibleCatalog(res.bibles));
      }
      return res;
    } catch (onlineErr) {
      if (isSqliteAvailable()) {
        try {
          await initOffline();
          const local = await listLocalBibles();
          if (local.length > 0) {
            return { bibles: local.map(({ downloaded: _d, downloadedAt: _a, ...b }) => b) };
          }
        } catch {
          // ponytail: cae al error de red original
        }
      }
      throw onlineErr instanceof Error ? onlineErr : new Error("Sin conexión");
    }
  }
  if (!isSqliteAvailable()) throw new Error("Sin conexión");
  try {
    await initOffline();
    const local = await listLocalBibles();
    if (local.length === 0) throw new Error("Sin conexión y no hay versiones descargadas");
    return { bibles: local.map(({ downloaded: _d, downloadedAt: _a, ...b }) => b) };
  } catch (err) {
    throw err instanceof Error ? err : new Error("Sin conexión");
  }
}

export async function repoListBooks(bibleId: number): Promise<{ books: Book[] }> {
  const local = await localBooksIfReady(bibleId);
  if (local) return { books: local };

  if (getIsOnline()) {
    const res = await api.listBooks(bibleId);
    if (isSqliteAvailable()) {
      await tryCache(() => cacheBooks(bibleId, res.books));
    }
    return res;
  }

  if (!isSqliteAvailable()) throw new Error("Sin conexión");
  const books = await getLocalBooks(bibleId);
  if (books.length === 0) {
    throw new Error("Descarga esta versión para leer sin conexión");
  }
  return { books };
}

export async function repoGetVerses(
  bibleId: number,
  bookId: number,
  chapter: number,
): Promise<{ verses: Verse[] }> {
  const local = await localVersesIfReady(bibleId, bookId, chapter);
  if (local) return { verses: local };

  if (getIsOnline()) {
    try {
      const res = await api.getVerses(bibleId, bookId, chapter);
      if (isSqliteAvailable()) {
        await tryCache(() => cacheChapterVerses(bibleId, bookId, chapter, res.verses));
      }
      return res;
    } catch (onlineErr) {
      if (isSqliteAvailable()) {
        try {
          const verses = await getLocalVerses(bibleId, bookId, chapter);
          if (verses.length > 0) return { verses };
        } catch {
          // ponytail: cae al error de red original
        }
      }
      throw onlineErr instanceof Error ? onlineErr : new Error("Sin conexión");
    }
  }

  if (!isSqliteAvailable()) throw new Error("Sin conexión");
  const verses = await getLocalVerses(bibleId, bookId, chapter);
  if (verses.length === 0) {
    throw new Error("Capítulo no disponible offline. Descarga la versión en Biblia → Descargas.");
  }
  return { verses };
}

export async function repoSearchVerses(bibleId: number, q: string) {
  if (getIsOnline()) {
    try {
      return await api.searchVerses(bibleId, q);
    } catch {
      // fall through to local
    }
  }
  if (isSqliteAvailable() && (await isBibleDownloaded(bibleId))) {
    const verses = await searchLocalVerses(bibleId, q);
    return { verses, total: verses.length, isReference: false };
  }
  throw new Error(
    getIsOnline()
      ? "Error en la búsqueda"
      : "Sin conexión. Descarga una versión en Biblia → Descargas para buscar offline.",
  );
}

export async function repoListBiblesWithStatus() {
  const { bibles } = await repoListBibles();
  if (!isSqliteAvailable()) {
    return bibles.map((b) => ({ ...b, downloaded: false, verseCount: 0 }));
  }

  let local: Awaited<ReturnType<typeof listLocalBibles>> = [];
  try {
    local = await listLocalBibles();
  } catch {
    return bibles.map((b) => ({ ...b, downloaded: false, verseCount: 0 }));
  }

  const map = new Map(local.map((l) => [l.bibleId, l]));
  return Promise.all(
    bibles.map(async (b) => {
      const meta = map.get(b.bibleId);
      const downloaded = meta?.downloaded ?? false;
      let verseCount = 0;
      if (downloaded) {
        try {
          verseCount = await getDownloadedSize(b.bibleId);
        } catch {
          verseCount = 0;
        }
      }
      return {
        ...b,
        downloaded,
        downloadedAt: meta?.downloadedAt,
        verseCount,
      };
    }),
  );
}

async function refreshNotebooksFromServer() {
  const res = await api.listNotebooks();
  await tryCache(() => cacheNotebooksFromServer(res.notebooks));
  for (const nb of res.notebooks) {
    const { notes } = await api.listNotebookNotes(nb.id);
    await tryCache(() => cacheNotesFromServer(notes));
  }
}

async function loadNotebooksView(): Promise<{ notebooks: Notebook[] }> {
  if (!isSqliteAvailable()) {
    if (useRemote()) return api.listNotebooks();
    throw new Error("Sin conexión");
  }

  await initOffline();

  if (useRemote()) {
    try {
      await syncAll();
    } catch {
      await refreshNotebooksFromServer().catch(() => {});
    }
    try {
      const local = await listLocalNotebooks();
      if (local.length > 0) return { notebooks: local };
    } catch {
      // ponytail: SQLite roto → API directa
    }
    return api.listNotebooks();
  }

  try {
    return { notebooks: await listLocalNotebooks() };
  } catch {
    throw new Error("Sin conexión");
  }
}

async function loadNotebookNotesView(notebookId: number): Promise<{ notes: NotebookNote[] }> {
  if (!isSqliteAvailable()) {
    if (useRemote()) return api.listNotebookNotes(notebookId);
    throw new Error("Sin conexión");
  }

  await initOffline();

  if (useRemote()) {
    try {
      await syncAll();
    } catch {
      try {
        const res = await api.listNotebookNotes(notebookId);
        await tryCache(() => cacheNotesFromServer(res.notes));
      } catch {
        // ponytail: muestra lo que haya en SQLite o API
      }
    }
    try {
      if (await resolveNotebookLocalId(notebookId)) {
        return { notes: await listLocalNotes(notebookId) };
      }
    } catch {
      // ponytail: SQLite roto → API directa
    }
    return api.listNotebookNotes(notebookId);
  }

  if (!(await resolveNotebookLocalId(notebookId))) return { notes: [] };
  try {
    return { notes: await listLocalNotes(notebookId) };
  } catch {
    throw new Error("Sin conexión");
  }
}

export async function repoListNotebooks(): Promise<{ notebooks: Notebook[] }> {
  return loadNotebooksView();
}

export async function repoListNotebookNotes(notebookId: number): Promise<{ notes: NotebookNote[] }> {
  return loadNotebookNotesView(notebookId);
}

export async function repoGetNotebookNote(noteId: number): Promise<{ note: NotebookNote }> {
  if (useRemote() && noteId > 0) {
    try {
      const res = await api.getNotebookNote(noteId);
      if (isSqliteAvailable()) await upsertNoteFromServer(res.note);
      return res;
    } catch {
      // cae a SQLite
    }
  }
  if (!isSqliteAvailable()) throw new Error("Nota no disponible offline");
  const note = await getLocalNote(noteId);
  if (!note) throw new Error("Nota no disponible offline");
  return { note };
}

export async function repoCreateNotebook(name: string, coverImage?: string | null) {
  if (useRemote() && isSqliteAvailable()) {
    try {
      const res = await api.createNotebook(name, coverImage);
      const ts = nowIso();
      await upsertNotebookFromServer({ id: res.id, name: res.name, coverImage: res.coverImage, createdAt: ts });
      return { id: res.id, name: res.name, coverImage: res.coverImage ?? null };
    } catch {
      // cae a cola offline
    }
  }
  if (!isSqliteAvailable()) {
    if (useRemote()) return api.createNotebook(name, coverImage);
    throw new Error("Sin conexión");
  }
  const local = await createLocalNotebook(name, coverImage);
  return { id: local.id, name: local.name, coverImage: local.coverImage };
}

export async function repoUpdateNotebook(id: number, name: string, coverImage?: string | null) {
  if (useRemote() && id > 0 && isSqliteAvailable()) {
    try {
      await api.updateNotebook(id, name, coverImage);
      const ts = nowIso();
      await upsertNotebookFromServer({ id, name, coverImage, createdAt: ts });
      return { ok: true };
    } catch {
      // cae a cola offline
    }
  }
  if (!isSqliteAvailable()) {
    if (useRemote() && id > 0) {
      await api.updateNotebook(id, name, coverImage);
      return { ok: true };
    }
    throw new Error("Sin conexión");
  }
  await updateLocalNotebook(id, name, coverImage);
  return { ok: true };
}

export async function repoDeleteNotebook(id: number) {
  if (useRemote() && id > 0 && isSqliteAvailable()) {
    try {
      await api.deleteNotebook(id);
      await evictNotebook(id);
      return { ok: true };
    } catch {
      // cae a cola offline
    }
  }
  if (!isSqliteAvailable()) {
    if (useRemote() && id > 0) {
      await api.deleteNotebook(id);
      return { ok: true };
    }
    throw new Error("Sin conexión");
  }
  await deleteLocalNotebook(id);
  return { ok: true };
}

export async function repoCreateNotebookNote(notebookId: number, title: string, content: string) {
  const finalTitle = title.trim() || "Sin título";
  if (useRemote() && notebookId > 0 && isSqliteAvailable()) {
    try {
      const res = await api.createNotebookNote(notebookId, finalTitle, content);
      const ts = nowIso();
      await upsertNoteFromServer({
        id: res.id,
        notebookId,
        title: res.title,
        content: res.content,
        tags: "[]",
        createdAt: ts,
        updatedAt: ts,
      });
      return { id: res.id, title: res.title, content: res.content };
    } catch {
      // cae a cola offline
    }
  }
  if (!isSqliteAvailable()) {
    if (useRemote() && notebookId > 0) {
      return api.createNotebookNote(notebookId, finalTitle, content);
    }
    throw new Error("Sin conexión");
  }
  const note = await createLocalNote(notebookId, finalTitle, content);
  return { id: note.id, title: note.title, content: note.content };
}

export async function repoUpdateNotebookNote(
  noteId: number,
  title: string,
  content: string,
  tags?: string[],
) {
  const finalTitle = title.trim() || "Sin título";
  if (useRemote() && noteId > 0 && isSqliteAvailable()) {
    try {
      await api.updateNotebookNote(noteId, finalTitle, content, tags);
      const fresh = await api.getNotebookNote(noteId);
      await upsertNoteFromServer(fresh.note);
      return { ok: true };
    } catch {
      // cae a cola offline
    }
  }
  if (!isSqliteAvailable()) {
    if (useRemote() && noteId > 0) {
      await api.updateNotebookNote(noteId, finalTitle, content, tags);
      return { ok: true };
    }
    throw new Error("Sin conexión");
  }
  await updateLocalNote(noteId, finalTitle, content, tags ? JSON.stringify(tags) : undefined);
  return { ok: true };
}

export async function repoDeleteNotebookNote(noteId: number) {
  if (useRemote() && noteId > 0 && isSqliteAvailable()) {
    try {
      await api.deleteNotebookNote(noteId);
      await evictNote(noteId);
      return { ok: true };
    } catch {
      // cae a cola offline
    }
  }
  if (!isSqliteAvailable()) {
    if (useRemote() && noteId > 0) {
      await api.deleteNotebookNote(noteId);
      return { ok: true };
    }
    throw new Error("Sin conexión");
  }
  await deleteLocalNote(noteId);
  return { ok: true };
}

export async function repoGetHighlights(bookId: number, chapter: number, bibleId: number) {
  if (getIsOnline()) {
    try {
      const res = await api.getHighlights(bookId, chapter, bibleId);
      if (isSqliteAvailable()) {
        await tryCache(() => upsertHighlightsFromServer(bookId, chapter, bibleId, res.highlights));
      }
      return res;
    } catch {
      // fall through
    }
  }
  if (!isSqliteAvailable()) return { highlights: [] };
  try {
    return { highlights: await getLocalHighlights(bookId, chapter, bibleId) };
  } catch {
    return { highlights: [] };
  }
}

export async function repoSetHighlights(
  bookId: number,
  chapter: number,
  verses: number[],
  color: string | null,
  bibleId: number,
) {
  if (isSqliteAvailable()) {
    for (const v of verses) {
      await setLocalHighlight(bookId, chapter, v, color, bibleId);
    }
  }
  if (getIsOnline()) {
    try {
      await api.setHighlights(bookId, chapter, verses, color, bibleId);
      if (isSqliteAvailable()) {
        const { run } = await import("@/lib/offline/db");
        for (const v of verses) {
          await run(
            "UPDATE highlights SET dirty = 0 WHERE book_id = ? AND chapter = ? AND verse = ? AND bible_id = ?",
            [bookId, chapter, v, bibleId],
          );
        }
      }
    } catch {
      // queued via dirty flag
    }
  }
  return { ok: true };
}

export async function repoListFavorites() {
  if (getIsOnline()) {
    try {
      const res = await api.listFavorites();
      if (isSqliteAvailable()) await upsertFavoritesFromServer(res.favorites);
      return res;
    } catch {
      // fall through
    }
  }
  if (!isSqliteAvailable()) throw new Error("Sin conexión");
  const { getAll } = await import("@/lib/offline/db");
  const rows = await getAll<{
    id: number;
    server_id: number | null;
    bible_id: number;
    book_id: number;
    book_name: string | null;
    chapter: number;
    verse: number;
    verse_text: string | null;
    created_at: string | null;
  }>("SELECT * FROM favorites WHERE deleted = 0 ORDER BY created_at DESC");
  return {
    favorites: rows.map((r) => ({
      id: r.server_id ?? r.id,
      bible_id: r.bible_id,
      book_id: r.book_id,
      book_name: r.book_name ?? "",
      chapter: r.chapter,
      verse: r.verse,
      verse_text: r.verse_text ?? "",
      created_at: r.created_at ?? "",
    })),
  };
}

export async function repoGetChapterFavorites(bibleId: number, bookId: number, chapter: number) {
  if (getIsOnline()) {
    try {
      const res = await api.listFavorites();
      if (isSqliteAvailable()) await upsertFavoritesFromServer(res.favorites);
    } catch {
      // use local
    }
  }
  if (!isSqliteAvailable()) return new Map<number, number>();
  return getLocalChapterFavorites(bibleId, bookId, chapter);
}

export async function repoAddFavorite(
  bibleId: number,
  bookId: number,
  chapter: number,
  verse: number,
  verseText?: string,
  bookName?: string,
) {
  if (isSqliteAvailable()) {
    await addLocalFavorite(bibleId, bookId, chapter, verse, verseText, bookName);
  }
  if (getIsOnline()) {
    try {
      const res = await api.addFavorite(bibleId, bookId, chapter, verse);
      if (isSqliteAvailable()) {
        const { setFavoriteServerId } = await import("@/lib/offline/readerStore");
        const { getAll } = await import("@/lib/offline/db");
        const row = await getAll<{ id: number }>(
          `SELECT id FROM favorites WHERE bible_id = ? AND book_id = ? AND chapter = ? AND verse = ? AND dirty = 1 ORDER BY id DESC LIMIT 1`,
          [bibleId, bookId, chapter, verse],
        );
        if (row[0]) await setFavoriteServerId(row[0].id, res.id);
      }
    } catch {
      // queued
    }
  }
  return { success: true };
}

export async function repoDeleteFavorite(id: number) {
  if (isSqliteAvailable()) await removeLocalFavorite(id);
  if (getIsOnline()) {
    try {
      if (id > 0) await api.deleteFavorite(id);
    } catch {
      // queued
    }
  }
  return { success: true };
}

export async function repoGetChapterNotes(bookId: number, chapter: number) {
  if (getIsOnline()) {
    try {
      const res = await api.getChapterNotes(bookId, chapter);
      if (isSqliteAvailable()) {
        await tryCache(() => upsertVerseNotesFromServer(bookId, chapter, res.links));
      }
      return res;
    } catch {
      // fall through
    }
  }
  if (!isSqliteAvailable()) return { links: [] };
  try {
    return { links: await getLocalChapterNotes(bookId, chapter) };
  } catch {
    return { links: [] };
  }
}

export async function repoDeleteVerseNote(noteId: number) {
  if (isSqliteAvailable()) {
    const { deleteLocalVerseNote } = await import("@/lib/offline/readerStore");
    await deleteLocalVerseNote(noteId);
  }
  if (getIsOnline()) {
    try {
      if (noteId > 0) await api.deleteVerseNote(noteId);
    } catch {
      // queued
    }
  }
  return { ok: true };
}

export async function repoSaveVerseNote(
  bookId: number,
  chapter: number,
  verse: number,
  noteContent: string,
) {
  if (isSqliteAvailable()) await saveLocalVerseNote(bookId, chapter, verse, noteContent);
  if (getIsOnline()) {
    try {
      await api.saveVerseNote(bookId, chapter, verse, noteContent);
    } catch {
      // queued
    }
  }
  return { success: true };
}
