import { useEffect, useState } from "react";
import * as api from "@/lib/api";
import { DEFAULT_BIBLE_ID } from "@/lib/config";
import { getRainbowHtml, type RainbowTheme } from "@/lib/rainbow-html";
import type { Book } from "@/lib/types";

function readRainbowTheme(): RainbowTheme {
  const dark = document.documentElement.classList.contains("dark");
  const s = getComputedStyle(document.documentElement);
  const css = (name: string) => s.getPropertyValue(name).trim();
  return {
    dark,
    background: css("--background"),
    text: css("--foreground"),
    textMuted: css("--muted-foreground"),
    border: css("--border"),
  };
}

function buildPayload(keys: number[], arcs: number[], books: Book[]) {
  const bookNames = new Map(books.map((b) => [b.bookId, b.bookName]));
  const labels: string[] = [];
  const bookIdx: number[] = [];
  const bookNameList: string[] = [];
  const chap: number[] = [];
  let lastBook = -1;
  let bookCounter = -1;

  for (const key of keys) {
    const bookId = Math.floor(key / 1000);
    const chapter = key % 1000;
    if (bookId !== lastBook) {
      lastBook = bookId;
      bookCounter++;
      bookNameList.push(bookNames.get(bookId) ?? `Libro ${bookId}`);
    }
    labels.push(`${bookNames.get(bookId) ?? `Libro ${bookId}`} ${chapter}`);
    bookIdx.push(bookCounter);
    chap.push(chapter);
  }

  return { labels, bookIdx, bookNames: bookNameList, chap, arcs };
}

export function ReferencesRainbowMap() {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setHtml(null);
      try {
        const [{ keys, arcs }, { books }] = await Promise.all([
          api.getChapterArcs(),
          api.listBooks(DEFAULT_BIBLE_ID),
        ]);
        if (cancelled) return;
        if (!keys.length) throw new Error("No hay referencias cruzadas");
        setHtml(getRainbowHtml(readRainbowTheme(), buildPayload(keys, arcs, books)));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error al cargar el mapa");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p className="py-24 text-center text-muted-foreground">Preparando visualización…</p>;
  }

  if (error || !html) {
    return (
      <p className="py-24 text-center text-muted-foreground">
        {error ?? "No hay datos de referencias cruzadas para mostrar el mapa."}
      </p>
    );
  }

  return (
    <iframe
      srcDoc={html}
      className="min-h-[70vh] w-full rounded-xl border border-border bg-background"
      sandbox="allow-scripts"
      title="Mapa de referencias"
    />
  );
}
