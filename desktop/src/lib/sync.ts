import * as api from "@/lib/api";
import { setMeta } from "@/lib/offline/db";
import { getIsOnline } from "@/lib/network";
import {
  getDirtyNotebooks,
  getDirtyNotes,
  markNotebookSynced,
  markNoteSynced,
  purgeDeletedNote,
  purgeDeletedNotebook,
  repairNotebookData,
  setNotebookServerId,
  setNoteServerId,
  upsertNoteFromServer,
  upsertNotebookFromServer,
} from "@/lib/offline/notesStore";
import {
  getDirtyFavorites,
  getDirtyHighlights,
  getDirtyVerseNotes,
  markFavoriteSynced,
  markHighlightSynced,
  markVerseNoteSynced,
  purgeFavorite,
  purgeHighlight,
  purgeVerseNote,
  setFavoriteServerId,
  setVerseNoteServerId,
  upsertFavoritesFromServer,
  upsertHighlightsFromServer,
} from "@/lib/offline/readerStore";

let activeSync: Promise<void> | null = null;
let resyncPending = false;

/** Sube cambios offline y refresca caché SQLite desde el servidor. */
export async function syncAll() {
  if (!getIsOnline()) return;
  if (!api.getApiToken()) return;
  if (activeSync) {
    resyncPending = true;
    return activeSync;
  }
  activeSync = (async () => {
    await repairNotebookData();
    do {
      resyncPending = false;
      await pushDirty();
      await pullFromServer();
      await setMeta("last_sync", new Date().toISOString());
    } while (resyncPending);
  })();
  try {
    await activeSync;
  } finally {
    activeSync = null;
  }
}

/** Pull del servidor → SQLite (solo caché). Usar cuando hay internet. */
export async function pullFromServer() {
  if (!getIsOnline() || !api.getApiToken()) return;
  await pullRemote();
}

async function pushDirty() {
  await pushDirtyNotebooks();
  await pushDirtyNotesOnly();

  for (const h of await getDirtyHighlights()) {
    try {
      const color = h.deleted ? null : h.color;
      await api.setHighlights(h.book_id, h.chapter, [h.verse], color, h.bible_id);
      if (h.deleted) await purgeHighlight(h.id);
      else await markHighlightSynced(h.id);
    } catch {
      // retry later
    }
  }

  for (const f of await getDirtyFavorites()) {
    try {
      if (f.deleted) {
        const sid = f.server_id ?? (f.id > 0 ? f.id : null);
        if (sid) await api.deleteFavorite(sid);
        await purgeFavorite(f.id);
      } else if (!f.server_id && f.id < 0) {
        const res = await api.addFavorite(f.bible_id, f.book_id, f.chapter, f.verse);
        await setFavoriteServerId(f.id, res.id);
      } else {
        await markFavoriteSynced(f.id);
      }
    } catch {
      // retry later
    }
  }

  for (const vn of await getDirtyVerseNotes()) {
    try {
      if (vn.deleted) {
        const sid = vn.server_id ?? (vn.id > 0 ? vn.id : null);
        if (sid) await api.deleteVerseNote(sid);
        await purgeVerseNote(vn.id);
      } else {
        const res = await api.saveVerseNote(vn.book_id, vn.chapter, vn.verse, vn.note_content ?? "");
        if (vn.id < 0) await setVerseNoteServerId(vn.id, res.id);
        else await markVerseNoteSynced(vn.id);
      }
    } catch {
      // retry later
    }
  }
}

async function pushDirtyNotebooks() {
  for (const nb of await getDirtyNotebooks()) {
    try {
      if (nb.deleted) {
        const sid = nb.server_id ?? (nb.id > 0 ? nb.id : null);
        if (sid) await api.deleteNotebook(sid);
        await purgeDeletedNotebook(nb.id);
        continue;
      }
      if (!nb.server_id && nb.id < 0) {
        const res = await api.createNotebook(nb.name, nb.cover_image);
        await setNotebookServerId(nb.id, res.id);
      } else {
        const sid = nb.server_id ?? nb.id;
        await api.updateNotebook(sid, nb.name, nb.cover_image);
        await markNotebookSynced(nb.id);
      }
    } catch {
      // ponytail: retry on next sync
    }
  }
}

async function pushDirtyNotesOnly() {
  for (const note of await getDirtyNotes()) {
    try {
      if (note.deleted) {
        const sid = note.server_id ?? (note.id > 0 ? note.id : null);
        if (sid) await api.deleteNotebookNote(sid);
        await purgeDeletedNote(note.id);
        continue;
      }
      const nbSid = await resolveNotebookServerId(note.notebook_id);
      if (!nbSid) continue;
      const title = (note.title || "").trim() || "Sin título";
      const sid = note.server_id ?? (note.id > 0 ? note.id : null);

      let tags: string[] | undefined;
      try {
        tags = note.tags ? JSON.parse(note.tags) : undefined;
      } catch {
        tags = undefined;
      }

      if (!sid) {
        const res = await api.createNotebookNote(nbSid, title, note.content);
        await setNoteServerId(note.id, res.id);
        continue;
      }

      try {
        await api.updateNotebookNote(sid, title, note.content, tags);
        await markNoteSynced(note.id);
      } catch (err) {
        const status = (err as { status?: number })?.status;
        if (status === 404) {
          const res = await api.createNotebookNote(nbSid, title, note.content);
          await setNoteServerId(note.id, res.id);
        } else {
          throw err;
        }
      }
    } catch {
      // retry later
    }
  }
}

async function resolveNotebookServerId(notebookId: number): Promise<number | null> {
  const { getFirst } = await import("@/lib/offline/db");
  const row = await getFirst<{ server_id: number | null; id: number }>(
    "SELECT server_id, id FROM notebooks WHERE id = ? OR server_id = ?",
    [notebookId, notebookId],
  );
  if (!row) return null;
  return row.server_id ?? (row.id > 0 ? row.id : null);
}

async function pullRemote() {
  const { notebooks } = await api.listNotebooks();
  for (const nb of notebooks) {
    await upsertNotebookFromServer(nb);
    const { notes } = await api.listNotebookNotes(nb.id);
    for (const note of notes) {
      await upsertNoteFromServer(note);
    }
  }

  const favorites = await api
    .listFavorites()
    .then((result) => result.favorites)
    .catch(() => []);
  await upsertFavoritesFromServer(favorites);

  const highlights = await api
    .getAllHighlights()
    .then((result) => result.highlights)
    .catch(() => []);
  const groups = new Map<
    string,
    {
      bibleId: number;
      bookId: number;
      chapter: number;
      items: Array<{ verse: number; color: string }>;
    }
  >();
  for (const highlight of highlights) {
    const key = `${highlight.bible_id}:${highlight.book_id}:${highlight.chapter}`;
    const group = groups.get(key) ?? {
      bibleId: highlight.bible_id,
      bookId: highlight.book_id,
      chapter: highlight.chapter,
      items: [],
    };
    group.items.push({ verse: highlight.verse, color: highlight.color });
    groups.set(key, group);
  }
  for (const group of groups.values()) {
    await upsertHighlightsFromServer(
      group.bookId,
      group.chapter,
      group.bibleId,
      group.items,
    );
  }
}
