import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import * as api from "@/lib/api";
import { DEFAULT_BIBLE_ID } from "@/lib/config";
import {
  addSearchHistory,
  clearSearchHistory,
  getSearchHistory,
  removeSearchHistory,
} from "@/lib/preferences";
import * as repo from "@/lib/repo";
import type { BibleTarget, Devotional, StrongEntry, Verse } from "@/lib/types";
import type { RecentNotebookNote } from "@/lib/repo";

type Filter = "verses" | "notes" | "devotionals" | "dictionary";
const FILTERS: Array<[Filter, string]> = [
  ["verses", "Biblia"],
  ["notes", "Notas"],
  ["devotionals", "Devocionales"],
  ["dictionary", "Diccionario"],
];
type State<T> = { items: T[]; loading: boolean };
const empty = <T,>(): State<T> => ({ items: [], loading: false });

function plain(html: string) {
  const node = document.createElement("div");
  node.innerHTML = html;
  return node.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

export function UniversalSearchPage({
  onOpenBible,
  onOpenNote,
}: {
  onOpenBible: (target: BibleTarget) => void;
  onOpenNote?: (notebookId: number, noteId: number) => void;
}) {
  const [query, setQuery] = useState("");
  const [bibleId, setBibleId] = useState(DEFAULT_BIBLE_ID);
  const [filters, setFilters] = useState<Set<Filter>>(
    () => new Set(FILTERS.map(([key]) => key)),
  );
  const [history, setHistory] = useState(getSearchHistory);
  const [verses, setVerses] = useState<State<Verse>>(empty);
  const [notes, setNotes] = useState<State<RecentNotebookNote>>(empty);
  const [devotionals, setDevotionals] = useState<State<Devotional>>(empty);
  const [dictionary, setDictionary] = useState<State<StrongEntry>>(empty);
  const requestId = useRef(0);

  useEffect(() => {
    repo
      .repoListBibles()
      .then(({ bibles, defaultBibleId }) =>
        setBibleId(defaultBibleId ?? bibles[0]?.bibleId ?? 0),
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setVerses(empty());
      setNotes(empty());
      setDevotionals(empty());
      setDictionary(empty());
      return;
    }
    if (!bibleId) return;
    const id = ++requestId.current;
    setVerses(filters.has("verses") ? { items: [], loading: true } : empty());
    setNotes(filters.has("notes") ? { items: [], loading: true } : empty());
    setDevotionals(
      filters.has("devotionals") ? { items: [], loading: true } : empty(),
    );
    setDictionary(
      filters.has("dictionary") ? { items: [], loading: true } : empty(),
    );
    const timer = window.setTimeout(() => {
      setHistory(addSearchHistory(q));
      if (filters.has("verses"))
        repo
          .repoSearchVerses(bibleId, q)
          .then(
            (r) =>
              requestId.current === id &&
              setVerses({ items: r.verses.slice(0, 8), loading: false }),
          )
          .catch(() => requestId.current === id && setVerses(empty()));
      if (filters.has("notes"))
        repo
          .repoSearchNotes(q, 8)
          .then(
            (r) =>
              requestId.current === id &&
              setNotes({ items: r.notes, loading: false }),
          )
          .catch(() => requestId.current === id && setNotes(empty()));
      if (filters.has("dictionary"))
        repo
          .repoSearchDictionary({ q, lang: "all" })
          .then(
            (r) =>
              requestId.current === id &&
              setDictionary({ items: r.entries.slice(0, 8), loading: false }),
          )
          .catch(() => requestId.current === id && setDictionary(empty()));
      if (filters.has("devotionals"))
        api
          .listDevotionals()
          .then(({ devotionals: list }) => {
            if (requestId.current !== id) return;
            const lower = q.toLowerCase();
            setDevotionals({
              items: list
                .filter((item) =>
                  `${item.title} ${item.verseRef ?? ""} ${JSON.stringify(item.content ?? "")}`
                    .toLowerCase()
                    .includes(lower),
                )
                .slice(0, 8),
              loading: false,
            });
          })
          .catch(() => requestId.current === id && setDevotionals(empty()));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query, filters, bibleId]);

  const loading =
    verses.loading ||
    notes.loading ||
    devotionals.loading ||
    dictionary.loading;
  const total =
    verses.items.length +
    notes.items.length +
    devotionals.items.length +
    dictionary.items.length;
  function toggle(key: Filter) {
    setFilters((current) => {
      const next = new Set(current);
      if (next.has(key) && next.size > 1) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="desktop-page space-y-5 p-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">
          Búsqueda universal
        </h1>
        <p className="text-sm text-muted-foreground">
          Biblia, notas, devocionales y diccionario en un solo lugar.
        </p>
      </header>
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
        <Icon name="search" size={19} className="text-muted-foreground" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Busca un versículo, palabra o nota…"
          className="min-w-0 flex-1 bg-transparent text-foreground outline-none"
        />
        {loading ? (
          <span className="animate-pulse text-primary">Buscando…</span>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => toggle(key)}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold ${filters.has(key) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {query.trim().length < 2 ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-foreground">Búsquedas recientes</h2>
            {history.length ? (
              <button
                className="text-xs text-muted-foreground"
                onClick={() => {
                  clearSearchHistory();
                  setHistory([]);
                }}
              >
                Borrar historial
              </button>
            ) : null}
          </div>
          {history.length ? (
            <div className="flex flex-wrap gap-2">
              {history.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center rounded-full bg-muted text-sm"
                >
                  <button
                    className="px-3 py-1.5 text-foreground"
                    onClick={() => setQuery(item)}
                  >
                    {item}
                  </button>
                  <button
                    aria-label={`Quitar ${item}`}
                    className="pr-2 text-muted-foreground"
                    onClick={() => setHistory(removeSearchHistory(item))}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Todavía no hay búsquedas.
            </p>
          )}
        </section>
      ) : null}
      {query.trim().length >= 2 && !loading && total === 0 ? (
        <EmptyState
          icon="search"
          title="Sin resultados"
          description="Prueba otra palabra o activa más filtros."
        />
      ) : null}
      {verses.items.length ? (
        <Result title="Biblia">
          {verses.items.map((verse) => (
            <button
              key={verse.id}
              onClick={() =>
                onOpenBible({
                  bibleId,
                  bookId: verse.bookId,
                  chapter: verse.chapter,
                })
              }
              className="block w-full border-b border-border py-3 text-left last:border-0"
            >
              <b className="text-primary">
                {verse.bookName} {verse.chapter}:{verse.verse}
              </b>
              <span className="mt-1 block text-sm text-foreground">
                {verse.text}
              </span>
            </button>
          ))}
        </Result>
      ) : null}
      {notes.items.length ? (
        <Result title="Notas">
          {notes.items.map((note) => (
            <button
              key={note.id}
              onClick={() => onOpenNote?.(note.notebookId, note.id)}
              className="block w-full border-b border-border py-3 text-left last:border-0"
            >
              <b className="text-foreground">{note.title || "Sin título"}</b>
              <span className="block text-xs text-primary">
                {note.notebookName}
              </span>
              <span className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {plain(note.content)}
              </span>
            </button>
          ))}
        </Result>
      ) : null}
      {devotionals.items.length ? (
        <Result title="Devocionales">
          {devotionals.items.map((item) => (
            <div
              key={item.id}
              className="border-b border-border py-3 last:border-0"
            >
              <b className="text-foreground">{item.title}</b>
              {item.verseRef ? (
                <span className="block text-sm text-primary">
                  {item.verseRef}
                </span>
              ) : null}
            </div>
          ))}
        </Result>
      ) : null}
      {dictionary.items.length ? (
        <Result title="Diccionario">
          {dictionary.items.map((item) => (
            <div
              key={item.strongCode}
              className="border-b border-border py-3 last:border-0"
            >
              <b className="text-primary">{item.strongCode}</b>{" "}
              <strong className="text-foreground">{item.lemma}</strong>
              <p className="mt-1 text-sm text-muted-foreground">
                {item.definition}
              </p>
            </div>
          ))}
        </Result>
      ) : null}
    </div>
  );
}

function Result({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 text-lg font-bold text-foreground">{title}</h2>
      <Card>{children}</Card>
    </section>
  );
}
