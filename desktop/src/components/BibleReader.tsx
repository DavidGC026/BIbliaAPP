import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { VerseImageCreatorModal } from "@/components/VerseImageCreatorModal";
import { CrossReferencesModal } from "@/components/CrossReferencesModal";
import { OfflineBanner } from "@/components/OfflineBanner";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { DEFAULT_BIBLE_ID } from "@/lib/config";
import {
  HIGHLIGHT_COLORS,
  highlightSwatch,
  verseHighlightStyle,
} from "@/lib/highlightColors";
import * as repo from "@/lib/repo";
import { buildImageCreatorData } from "@/lib/verseUtils";
import {
  DEFAULT_READER_PREFERENCES,
  getReaderPreferences,
  saveLastPassage,
  saveReaderPreferences,
  type ReaderPreferences,
  type ReaderTheme,
} from "@/lib/preferences";
import * as api from "@/lib/api";
import type {
  BibleTarget,
  Book,
  BibleVersion,
  Verse,
  VerseHighlight,
  VerseNoteLink,
} from "@/lib/types";

const SELECT_CLS =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground";

type Props = {
  target?: BibleTarget;
};

function selectionLabel(
  bookName: string,
  chapter: number,
  selected: number[],
): string {
  if (selected.length === 0) return "";
  const sorted = [...selected].sort((a, b) => a - b);
  const ref =
    sorted.length === 1
      ? `${bookName} ${chapter}:${sorted[0]}`
      : `${bookName} ${chapter}:${sorted[0]}-${sorted[sorted.length - 1]}`;
  return ref;
}

export function BibleReader({ target }: Props) {
  const { token } = useAuth();
  const canAnnotate = !!token;

  const [bibles, setBibles] = useState<BibleVersion[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [highlights, setHighlights] = useState<VerseHighlight[]>([]);
  const [noteLinks, setNoteLinks] = useState<VerseNoteLink[]>([]);
  const [bibleId, setBibleId] = useState(DEFAULT_BIBLE_ID);
  const [bookId, setBookId] = useState<number | null>(null);
  const [chapter, setChapter] = useState(1);
  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [imageCreatorOpen, setImageCreatorOpen] = useState(false);
  const [refsModalOpen, setRefsModalOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingChapter, setLoadingChapter] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<ReaderPreferences>(() =>
    getReaderPreferences(),
  );
  const [showPreferences, setShowPreferences] = useState(false);

  const lastSelectedRef = useRef<number | null>(null);
  const isDark = document.documentElement.classList.contains("dark");

  const selectedBook = books.find((b) => b.bookId === bookId) ?? null;
  const maxChapter = selectedBook?.chapters ?? 1;
  const currentBible = bibles.find((b) => b.bibleId === bibleId);
  const highlightMap = new Map(highlights.map((h) => [h.verse, h.color]));
  const noteMap = new Map(noteLinks.map((n) => [n.verse, n]));
  const primaryVerse =
    selectedVerses.length === 1
      ? selectedVerses[0]
      : (selectedVerses[0] ?? null);

  const imageCreatorData = useMemo(() => {
    if (!selectedBook || selectedVerses.length === 0) return null;
    return buildImageCreatorData({
      selectedVerses,
      verses,
      bookName: selectedBook.bookName,
      chapter,
      bibleAbbr: currentBible?.abbr ?? "RVR1960",
    });
  }, [selectedVerses, verses, selectedBook, chapter, currentBible?.abbr]);

  const clearSelection = useCallback(() => {
    setSelectedVerses([]);
    lastSelectedRef.current = null;
  }, []);

  const loadChapter = useCallback(async () => {
    if (bookId === null) return;
    const bid = bookId;
    setLoadingChapter(true);
    setError(null);
    try {
      const tasks: [
        Promise<{ verses: Verse[] }>,
        Promise<{ highlights: VerseHighlight[] }>,
        Promise<{ links: VerseNoteLink[] }>,
      ] = [
        repo.repoGetVerses(bibleId, bid, chapter),
        canAnnotate
          ? repo.repoGetHighlights(bid, chapter, bibleId)
          : Promise.resolve({ highlights: [] }),
        canAnnotate
          ? repo.repoGetChapterNotes(bid, chapter)
          : Promise.resolve({ links: [] }),
      ];
      const [versesRes, hlRes, notesRes] = await Promise.allSettled(tasks);
      if (versesRes.status === "rejected") throw versesRes.reason;
      setVerses(versesRes.value.verses);
      setHighlights(hlRes.status === "fulfilled" ? hlRes.value.highlights : []);
      setNoteLinks(notesRes.status === "fulfilled" ? notesRes.value.links : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar capítulo");
    } finally {
      setLoadingChapter(false);
    }
  }, [bibleId, bookId, chapter, canAnnotate]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        setLoading(true);
        setError(null);
        const { bibles: list, defaultBibleId } = await repo.repoListBibles();
        if (cancelled) return;
        setBibles(list);
        const startBible =
          (target?.bibleId && list.some((b) => b.bibleId === target.bibleId)
            ? target.bibleId
            : null) ??
          list.find((b) => b.bibleId === (defaultBibleId ?? DEFAULT_BIBLE_ID))
            ?.bibleId ??
          list[0]?.bibleId ??
          DEFAULT_BIBLE_ID;
        setBibleId(startBible);
        const { books: bookList } = await repo.repoListBooks(startBible);
        if (cancelled) return;
        if (bookList.length === 0)
          throw new Error("No se encontraron libros para esta versión.");
        setBooks(bookList);
        const startBook =
          target?.bookId && bookList.some((b) => b.bookId === target.bookId)
            ? target.bookId
            : (bookList[0]?.bookId ?? null);
        setBookId(startBook);
        setChapter(target?.chapter && target.chapter > 0 ? target.chapter : 1);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Error al cargar la Biblia",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [target]);

  useEffect(() => {
    if (!target?.bookId || books.length === 0) return;
    if (!books.some((b) => b.bookId === target.bookId)) return;
    setBookId(target.bookId);
    if (target.bibleId) setBibleId(target.bibleId);
    setChapter(target.chapter > 0 ? target.chapter : 1);
  }, [target, books]);

  useEffect(() => {
    clearSelection();
    void loadChapter();
  }, [loadChapter, clearSelection]);

  useEffect(() => {
    if (
      loadingChapter ||
      verses.length === 0 ||
      !selectedBook ||
      !currentBible ||
      !bookId ||
      !chapter
    )
      return;
    saveLastPassage({
      bibleId,
      bibleAbbr: currentBible.abbr,
      bookId,
      bookName: selectedBook.bookName,
      chapter,
    });
    const activityKey = `bibliaapp_read_${new Date().toISOString().slice(0, 10)}_${bookId}_${chapter}`;
    if (!sessionStorage.getItem(activityKey)) {
      sessionStorage.setItem(activityKey, "1");
      api.recordReadingActivity(bookId, 1, verses.length).catch(() => {});
    }
  }, [
    bibleId,
    bookId,
    chapter,
    selectedBook,
    currentBible,
    loadingChapter,
    verses.length,
  ]);

  function updatePreferences(next: ReaderPreferences) {
    setPreferences(next);
    saveReaderPreferences(next);
  }

  function toggleVerse(verseNum: number, extend: boolean) {
    if (extend && lastSelectedRef.current !== null) {
      const anchor = lastSelectedRef.current;
      const start = Math.min(anchor, verseNum);
      const end = Math.max(anchor, verseNum);
      const range: number[] = [];
      for (let i = start; i <= end; i++) range.push(i);
      lastSelectedRef.current = verseNum;
      setSelectedVerses(Array.from(new Set(range)).sort((a, b) => a - b));
      return;
    }
    lastSelectedRef.current = verseNum;
    setSelectedVerses((prev) =>
      prev.includes(verseNum)
        ? prev.filter((v) => v !== verseNum)
        : [...prev, verseNum].sort((a, b) => a - b),
    );
  }

  async function onBibleChange(nextId: number) {
    clearSelection();
    setBibleId(nextId);
    try {
      setLoadingChapter(true);
      const { books: bookList } = await repo.repoListBooks(nextId);
      if (bookList.length === 0)
        throw new Error("No se encontraron libros para esta versión.");
      setBooks(bookList);
      setBookId(bookList[0]?.bookId ?? null);
      setChapter(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cambiar versión");
    } finally {
      setLoadingChapter(false);
    }
  }

  async function addToFavorites() {
    if (!bookId || selectedVerses.length === 0 || !canAnnotate) return;
    setSaving(true);
    try {
      for (const verseNum of selectedVerses) {
        const verse = verses.find((item) => item.verse === verseNum);
        await repo.repoAddFavorite(
          bibleId,
          bookId,
          chapter,
          verseNum,
          verse?.text,
          selectedBook?.bookName,
        );
      }
      clearSelection();
    } finally {
      setSaving(false);
    }
  }

  async function applyHighlight(color: string) {
    if (!bookId || selectedVerses.length === 0 || !canAnnotate) return;
    setSaving(true);
    try {
      await repo.repoSetHighlights(
        bookId,
        chapter,
        selectedVerses,
        color,
        bibleId,
      );
      clearSelection();
      await loadChapter();
    } finally {
      setSaving(false);
    }
  }

  async function removeHighlight() {
    if (!bookId || selectedVerses.length === 0 || !canAnnotate) return;
    setSaving(true);
    try {
      await repo.repoSetHighlights(
        bookId,
        chapter,
        selectedVerses,
        null,
        bibleId,
      );
      clearSelection();
      await loadChapter();
    } finally {
      setSaving(false);
    }
  }

  async function copySelection() {
    if (!selectedBook || selectedVerses.length === 0) return;
    if (currentBible?.canCopy === false) {
      setError("La licencia de esta versión no permite copiar el texto.");
      return;
    }
    const sorted = [...selectedVerses].sort((a, b) => a - b);
    const lines = sorted
      .map((n) => {
        const v = verses.find((x) => x.verse === n);
        return v ? `${n} ${v.text}` : "";
      })
      .filter(Boolean);
    const ref =
      sorted.length === 1
        ? `${selectedBook.bookName} ${chapter}:${sorted[0]}`
        : `${selectedBook.bookName} ${chapter}:${sorted[0]}-${sorted[sorted.length - 1]}`;
    await navigator.clipboard.writeText(`${ref}\n\n${lines.join("\n")}`);
  }

  async function shareSelection() {
    if (!selectedBook || selectedVerses.length === 0) return;
    if (currentBible?.canShare === false) {
      setError("La licencia de esta versión no permite compartir el texto.");
      return;
    }
    const sorted = [...selectedVerses].sort((a, b) => a - b);
    const text = sorted
      .map((number) => verses.find((item) => item.verse === number)?.text)
      .filter(Boolean)
      .join(" ");
    const reference = selectionLabel(
      selectedBook.bookName,
      chapter,
      selectedVerses,
    );
    const message = `“${text}”\n\n— ${reference}${currentBible?.abbr ? ` (${currentBible.abbr})` : ""}\n\nCompartido desde BibliaAPP`;
    if (navigator.share)
      await navigator
        .share({ title: reference, text: message })
        .catch(() => {});
    else await navigator.clipboard.writeText(message);
  }

  function openNoteModal() {
    if (primaryVerse === null) return;
    setNoteText(noteMap.get(primaryVerse)?.noteContent ?? "");
    setNoteModalOpen(true);
  }

  async function saveNote() {
    if (!bookId || primaryVerse === null || !canAnnotate) return;
    setSaving(true);
    try {
      await repo.repoSaveVerseNote(
        bookId,
        chapter,
        primaryVerse,
        noteText.trim(),
      );
      setNoteModalOpen(false);
      await loadChapter();
    } finally {
      setSaving(false);
    }
  }

  async function deleteNote() {
    if (primaryVerse === null || !canAnnotate) return;
    const link = noteMap.get(primaryVerse);
    if (!link?.id) return;
    setSaving(true);
    try {
      await repo.repoDeleteVerseNote(link.id);
      setNoteModalOpen(false);
      setNoteText("");
      await loadChapter();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-muted-foreground">Cargando Biblia…</p>
      </div>
    );
  }

  return (
    <div className="desktop-page relative space-y-6 p-6 pb-28">
      <OfflineBanner bibleId={bibleId} autoHideMs={10000} />
      <header>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Lector bíblico
            </h1>
            <p className="text-sm text-muted-foreground">
              {currentBible?.name ?? "Versión"} ·{" "}
              {selectedBook?.bookName ?? "—"} {chapter}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowPreferences((value) => !value)}
          >
            Aa
          </Button>
        </div>
        {!canAnnotate ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Inicia sesión para subrayar versículos y añadir notas.
          </p>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            Clic en un versículo para seleccionar · Shift+clic para rango
          </p>
        )}
      </header>

      {showPreferences ? (
        <div className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm text-muted-foreground">
            Tamaño{" "}
            <input
              type="range"
              min={16}
              max={24}
              value={preferences.fontSize}
              onChange={(e) =>
                updatePreferences({
                  ...preferences,
                  fontSize: Number(e.target.value),
                })
              }
              className="mt-2 block w-full"
            />
            <span className="text-xs">{preferences.fontSize}px</span>
          </label>
          <label className="text-sm text-muted-foreground">
            Espaciado
            <select
              value={preferences.density}
              onChange={(e) =>
                updatePreferences({
                  ...preferences,
                  density: e.target.value as ReaderPreferences["density"],
                })
              }
              className={SELECT_CLS}
            >
              <option value="relaxed">Relajado</option>
              <option value="compact">Compacto</option>
            </select>
          </label>
          <label className="text-sm text-muted-foreground">
            Alineación
            <select
              value={preferences.align}
              onChange={(e) =>
                updatePreferences({
                  ...preferences,
                  align: e.target.value as ReaderPreferences["align"],
                })
              }
              className={SELECT_CLS}
            >
              <option value="left">Izquierda</option>
              <option value="justify">Justificado</option>
            </select>
          </label>
          <label className="text-sm text-muted-foreground">
            Tema de lectura
            <select
              value={preferences.theme}
              onChange={(e) =>
                updatePreferences({
                  ...preferences,
                  theme: e.target.value as ReaderTheme,
                })
              }
              className={SELECT_CLS}
            >
              <option value="auto">Automático</option>
              <option value="light">Claro</option>
              <option value="sepia">Sepia</option>
              <option value="night">Noche</option>
              <option value="contrast">Contraste</option>
            </select>
          </label>
          <button
            className="text-left text-xs font-semibold text-primary"
            onClick={() => updatePreferences(DEFAULT_READER_PREFERENCES)}
          >
            Restaurar preferencias
          </button>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-sm">
          <span className="mb-1 block text-muted-foreground">Versión</span>
          <select
            value={bibleId}
            onChange={(e) => onBibleChange(Number(e.target.value))}
            className={SELECT_CLS}
          >
            {bibles.map((b) => (
              <option key={b.bibleId} value={b.bibleId}>
                {b.abbr} — {b.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-muted-foreground">Libro</span>
          <select
            value={bookId ?? ""}
            onChange={(e) => {
              clearSelection();
              setBookId(Number(e.target.value));
              setChapter(1);
            }}
            className={SELECT_CLS}
          >
            {books.map((b) => (
              <option key={b.bookId} value={b.bookId}>
                {b.bookName}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-muted-foreground">Capítulo</span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={chapter <= 1}
              onClick={() => {
                clearSelection();
                setChapter((c) => Math.max(1, c - 1));
              }}
              className="rounded-lg border border-border px-3 py-2 text-foreground disabled:opacity-40"
            >
              ‹
            </button>
            <select
              value={chapter}
              onChange={(e) => {
                clearSelection();
                setChapter(Number(e.target.value));
              }}
              className={`min-w-0 flex-1 ${SELECT_CLS}`}
            >
              {Array.from({ length: maxChapter }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={chapter >= maxChapter}
              onClick={() => {
                clearSelection();
                setChapter((c) => Math.min(maxChapter, c + 1));
              }}
              className="rounded-lg border border-border px-3 py-2 text-foreground disabled:opacity-40"
            >
              ›
            </button>
          </div>
        </label>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <article
        className={`reader-theme-${preferences.theme} rounded-xl border border-border p-6`}
      >
        {loadingChapter ? (
          <p className="text-muted-foreground">Cargando capítulo…</p>
        ) : (
          <div
            className={`font-serif ${preferences.density === "compact" ? "space-y-1 leading-snug" : "space-y-3 leading-relaxed"}`}
            style={{
              fontSize: preferences.fontSize,
              textAlign: preferences.align,
            }}
          >
            {verses.map((v) => {
              const hl = highlightMap.get(v.verse);
              const hasNote = noteMap.has(v.verse);
              const isSelected = selectedVerses.includes(v.verse);
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={(e) => toggleVerse(v.verse, e.shiftKey)}
                  className={`block w-full cursor-pointer rounded-md py-1 text-left transition-colors ${
                    isSelected
                      ? "bg-primary/20 ring-1 ring-primary/40"
                      : "hover:bg-accent/50"
                  }`}
                  style={
                    hl && !isSelected
                      ? verseHighlightStyle(hl, isDark)
                      : undefined
                  }
                >
                  <sup className="mr-1 text-xs font-bold text-primary">
                    {v.verse}
                    {hasNote ? " 📝" : ""}
                  </sup>
                  {v.text}
                </button>
              );
            })}
          </div>
        )}
      </article>

      {selectedVerses.length > 0 ? (
        <div className="fixed bottom-4 left-1/2 z-50 w-[min(640px,calc(100%-2rem))] -translate-x-1/2 rounded-xl border border-border bg-card p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="truncate text-xs font-medium text-muted-foreground">
              {selectionLabel(
                selectedBook?.bookName ?? "",
                chapter,
                selectedVerses,
              )}
            </span>
            <button
              type="button"
              onClick={clearSelection}
              className="text-muted-foreground hover:text-foreground"
            >
              ×
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => copySelection()}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-primary"
            >
              Copiar
            </button>
            <button
              type="button"
              onClick={() => shareSelection()}
              disabled={currentBible?.canShare === false}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-primary disabled:opacity-40"
            >
              Compartir
            </button>
            {imageCreatorData ? (
              <button
                type="button"
                onClick={() => setImageCreatorOpen(true)}
                disabled={currentBible?.canCreateImages === false}
                className="rounded-lg border border-primary px-3 py-1.5 text-xs font-semibold text-primary disabled:opacity-40"
              >
                Imagen
              </button>
            ) : null}
            {canAnnotate
              ? HIGHLIGHT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    disabled={saving}
                    title={c}
                    onClick={() => applyHighlight(c)}
                    className="h-8 w-8 rounded-full border border-black/10"
                    style={{ backgroundColor: highlightSwatch(c) }}
                  />
                ))
              : null}
            {canAnnotate ? (
              <>
                <button
                  type="button"
                  disabled={saving}
                  onClick={addToFavorites}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-primary"
                >
                  ♥ Favorito
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={removeHighlight}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground"
                >
                  Quitar
                </button>
                {primaryVerse !== null ? (
                  <button
                    type="button"
                    onClick={openNoteModal}
                    className="rounded-lg border border-primary px-3 py-1.5 text-xs font-semibold text-primary"
                  >
                    Nota
                  </button>
                ) : null}
              </>
            ) : null}
            {primaryVerse !== null ? (
              <button
                type="button"
                onClick={() => setRefsModalOpen(true)}
                className="rounded-lg border border-primary px-3 py-1.5 text-xs font-semibold text-primary"
              >
                Referencias
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {imageCreatorData ? (
        <VerseImageCreatorModal
          open={imageCreatorOpen}
          onClose={() => setImageCreatorOpen(false)}
          text={imageCreatorData.text}
          reference={imageCreatorData.reference}
          abbr={imageCreatorData.abbr}
        />
      ) : null}

      <CrossReferencesModal
        open={refsModalOpen}
        bibleId={bibleId}
        bookId={bookId}
        chapter={chapter}
        verse={primaryVerse}
        reference={`${selectedBook?.bookName ?? ""} ${chapter}:${primaryVerse ?? ""}`}
        onClose={() => setRefsModalOpen(false)}
        onOpenReference={(refBookId, refChapter) => {
          clearSelection();
          setBookId(refBookId);
          setChapter(refChapter);
        }}
      />

      {noteModalOpen && primaryVerse !== null ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-4 shadow-xl">
            <h2 className="mb-3 font-bold text-foreground">
              Nota · {selectedBook?.bookName} {chapter}:{primaryVerse}
            </h2>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={5}
              placeholder="Escribe tu nota…"
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={saveNote}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                Guardar
              </button>
              {noteMap.has(primaryVerse) ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={deleteNote}
                  className="rounded-lg border border-destructive px-4 py-2 text-sm text-destructive"
                >
                  Eliminar
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setNoteModalOpen(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
