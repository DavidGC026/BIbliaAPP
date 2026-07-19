import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DEFAULT_BIBLE_ID } from "@/lib/config";
import * as repo from "@/lib/repo";
import { formatVerseHtml } from "@/lib/verseInsert";
import type { BibleVersion, Book, Verse } from "@/lib/types";

const SELECT_CLS =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground";

type Props = {
  open: boolean;
  onClose: () => void;
  onInsert: (html: string) => void;
};

export function InsertVerseModal({ open, onClose, onInsert }: Props) {
  const [bibles, setBibles] = useState<BibleVersion[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [bibleId, setBibleId] = useState(DEFAULT_BIBLE_ID);
  const [bookId, setBookId] = useState<number | null>(null);
  const [chapter, setChapter] = useState(1);
  const [selected, setSelected] = useState<Pick<Verse, "verse" | "text">[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    repo
      .repoListBibles()
      .then(({ bibles: list, defaultBibleId }) => {
        setBibles(list);
        if (!list.some((bible) => bible.bibleId === bibleId))
          setBibleId(defaultBibleId ?? list[0]?.bibleId ?? 0);
      })
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open || !bibleId) return;
    repo
      .repoListBooks(bibleId)
      .then(({ books: list }) => {
        setBooks(list);
        setBookId(list[0]?.bookId ?? null);
        setChapter(1);
        setSelected([]);
      })
      .catch(() => {});
  }, [open, bibleId]);

  useEffect(() => {
    if (!open || !bookId) return;
    setLoading(true);
    setSelected([]);
    repo
      .repoGetVerses(bibleId, bookId, chapter)
      .then(({ verses: list }) => setVerses(list))
      .catch(() => setVerses([]))
      .finally(() => setLoading(false));
  }, [open, bibleId, bookId, chapter]);

  if (!open) return null;

  const selectedBook = books.find((b) => b.bookId === bookId);
  const selectedBible = bibles.find((b) => b.bibleId === bibleId);
  const maxChapter = selectedBook?.chapters ?? 1;

  function toggleVerse(v: Verse) {
    setSelected((prev) => {
      if (prev.some((s) => s.verse === v.verse))
        return prev.filter((s) => s.verse !== v.verse);
      return [...prev, { verse: v.verse, text: v.text }].sort(
        (a, b) => a.verse - b.verse,
      );
    });
  }

  function insert() {
    if (selected.length === 0 || !selectedBook || !selectedBible) return;
    const html = formatVerseHtml(
      selected,
      selectedBook.bookName,
      chapter,
      selectedBible.abbr,
    );
    onInsert(html);
    setSelected([]);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="font-bold text-foreground">Insertar versículos</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-muted-foreground"
          >
            Cerrar
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2 border-b border-border p-4 sm:grid-cols-3">
          <select
            className={SELECT_CLS}
            value={bibleId}
            onChange={(e) => setBibleId(Number(e.target.value))}
          >
            {bibles.map((b) => (
              <option key={b.bibleId} value={b.bibleId}>
                {b.abbr} — {b.name}
              </option>
            ))}
          </select>
          <select
            className={SELECT_CLS}
            value={bookId ?? ""}
            onChange={(e) => {
              setBookId(Number(e.target.value));
              setChapter(1);
            }}
          >
            {books.map((b) => (
              <option key={b.bookId} value={b.bookId}>
                {b.bookName}
              </option>
            ))}
          </select>
          <select
            className={SELECT_CLS}
            value={chapter}
            onChange={(e) => setChapter(Number(e.target.value))}
          >
            {Array.from({ length: maxChapter }, (_, i) => i + 1).map((ch) => (
              <option key={ch} value={ch}>
                Capítulo {ch}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between px-4 py-2">
          <span className="text-xs font-semibold text-muted-foreground">
            SELECCIONA VERSÍCULOS
          </span>
          {verses.length > 0 ? (
            <button
              type="button"
              className="text-xs font-semibold text-primary"
              onClick={() =>
                setSelected((prev) =>
                  prev.length === verses.length
                    ? []
                    : verses.map((v) => ({ verse: v.verse, text: v.text })),
                )
              }
            >
              {selected.length === verses.length
                ? "Deseleccionar todo"
                : "Seleccionar todo"}
            </button>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pb-4">
          {loading ? (
            <p className="text-muted-foreground">Cargando…</p>
          ) : (
            verses.map((v) => {
              const checked = selected.some((s) => s.verse === v.verse);
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => toggleVerse(v)}
                  className={`flex w-full gap-2 rounded-lg border p-3 text-left ${
                    checked
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:bg-accent/50"
                  }`}
                >
                  <span className="font-extrabold text-primary">{v.verse}</span>
                  <span className="flex-1 text-sm text-foreground">
                    {v.text}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border p-3">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={selected.length === 0} onClick={insert}>
            Insertar{selected.length > 0 ? ` (${selected.length})` : ""}
          </Button>
        </div>
      </div>
    </div>
  );
}
