import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { ReferencesRainbowMap } from "@/components/ReferencesRainbowMap";
import * as api from "@/lib/api";
import { DEFAULT_BIBLE_ID } from "@/lib/config";
import type { BibleVersion, Book, CrossReference } from "@/lib/types";

const SELECT_CLS =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground";

type Props = {
  onOpenReference?: (bookId: number, chapter: number, bibleId?: number) => void;
};

export function ReferencesExplorer({ onOpenReference }: Props) {
  const [view, setView] = useState<"list" | "map">("list");
  const [bibles, setBibles] = useState<BibleVersion[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [bibleId, setBibleId] = useState(DEFAULT_BIBLE_ID);
  const [bookId, setBookId] = useState(1);
  const [chapter, setChapter] = useState("1");
  const [verse, setVerse] = useState("1");
  const [refs, setRefs] = useState<CrossReference[]>([]);
  const [sourceText, setSourceText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listBibles()
      .then(({ bibles: list, defaultBibleId }) => {
        setBibles(list);
        if (!list.some((bible) => bible.bibleId === bibleId))
          setBibleId(defaultBibleId ?? list[0]?.bibleId ?? 0);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!bibleId) return;
    api
      .listBooks(bibleId)
      .then(({ books: list }) => {
        setBooks(list);
        if (!list.some((b) => b.bookId === bookId))
          setBookId(list[0]?.bookId ?? 1);
      })
      .catch(() => {});
  }, [bibleId, bookId]);

  const load = useCallback(async () => {
    const ch = Number(chapter);
    const vs = Number(verse);
    if (!bookId || !ch || !vs) return;
    setLoading(true);
    setError(null);
    try {
      const [{ references }, { verses }] = await Promise.all([
        api.getCrossReferences(bibleId, bookId, ch, vs),
        api.getVerses(bibleId, bookId, ch),
      ]);
      setRefs(references);
      setSourceText(verses.find((v) => v.verse === vs)?.text ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setRefs([]);
      setSourceText(null);
    } finally {
      setLoading(false);
    }
  }, [bibleId, bookId, chapter, verse]);

  useEffect(() => {
    void load();
  }, [load]);

  const bookName = books.find((b) => b.bookId === bookId)?.bookName ?? "";

  if (view === "map") {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-6">
        <button
          type="button"
          onClick={() => setView("list")}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Volver al explorador
        </button>
        <header>
          <h2 className="text-xl font-bold text-foreground">
            🌈 Mapa de referencias
          </h2>
          <p className="text-sm text-muted-foreground">
            Cada arco conecta dos capítulos que se citan entre sí. Haz clic en
            un capítulo para ver sus conexiones.
          </p>
        </header>
        <ReferencesRainbowMap />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-6">
      <header>
        <h2 className="text-xl font-bold text-foreground">
          Referencias cruzadas
        </h2>
        <p className="text-sm text-muted-foreground">
          Versículos relacionados con el pasaje seleccionado.
        </p>
      </header>

      <button
        type="button"
        onClick={() => setView("map")}
        className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-accent/40"
      >
        <span className="text-xl" aria-hidden>
          🌈
        </span>
        <span className="flex-1">
          <span className="block font-semibold text-foreground">
            Mapa de referencias
          </span>
          <span className="block text-xs text-muted-foreground">
            Toda la Biblia en un vistazo
          </span>
        </span>
      </button>

      <Card className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block text-muted-foreground">Versión</span>
          <select
            value={bibleId}
            onChange={(e) => setBibleId(Number(e.target.value))}
            className={SELECT_CLS}
          >
            {bibles.map((b) => (
              <option key={b.bibleId} value={b.bibleId}>
                {b.abbr}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block text-muted-foreground">Libro</span>
          <select
            value={bookId}
            onChange={(e) => {
              setBookId(Number(e.target.value));
              setChapter("1");
              setVerse("1");
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
          <input
            type="number"
            min={1}
            value={chapter}
            onChange={(e) => setChapter(e.target.value)}
            className={SELECT_CLS}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-muted-foreground">Versículo</span>
          <input
            type="number"
            min={1}
            value={verse}
            onChange={(e) => setVerse(e.target.value)}
            className={SELECT_CLS}
          />
        </label>
      </Card>

      {sourceText ? (
        <Card className="border-primary/30 bg-primary/5">
          <p className="font-bold text-primary">
            {bookName} {chapter}:{verse}
          </p>
          <p className="mt-2 font-serif italic leading-relaxed text-foreground">
            {sourceText}
          </p>
        </Card>
      ) : null}

      <h3 className="text-lg font-extrabold text-foreground">
        Referencias ({refs.length})
      </h3>

      {loading ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : refs.length === 0 ? (
        <p className="text-center text-muted-foreground">
          {error ?? "No hay referencias cruzadas para este versículo."}
        </p>
      ) : (
        <div className="space-y-2">
          {refs.map((item, i) => (
            <Card
              key={`${item.book_id}-${item.chapter}-${item.verse}-${i}`}
              className="cursor-pointer transition-colors hover:bg-accent/50"
              onClick={() =>
                onOpenReference?.(item.book_id, item.chapter, bibleId)
              }
            >
              <p className="font-bold text-primary">
                {item.book_name} {item.chapter}:{item.verse}
              </p>
              <p className="mt-1 font-serif leading-relaxed text-foreground">
                {item.text}
              </p>
              {item.votos > 0 ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.votos} votos
                </p>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
