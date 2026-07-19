import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DEFAULT_BIBLE_ID } from "@/lib/config";
import * as repo from "@/lib/repo";
import type { BibleVersion, Verse } from "@/lib/types";

type Props = {
  onOpenVerse: (bookId: number, chapter: number, bibleId?: number) => void;
};

export function BibleSearch({ onOpenVerse }: Props) {
  const [bibles, setBibles] = useState<BibleVersion[]>([]);
  const [bibleId, setBibleId] = useState(DEFAULT_BIBLE_ID);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Verse[]>([]);
  const [isReference, setIsReference] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    repo
      .repoListBibles()
      .then(({ bibles: list, defaultBibleId }) => {
        setBibles(list);
        if (!list.some((bible) => bible.bibleId === bibleId))
          setBibleId(defaultBibleId ?? list[0]?.bibleId ?? 0);
      })
      .catch(() => {});
  }, []);

  async function search() {
    const q = query.trim();
    if (q.length < 2) {
      setError("Escribe al menos 2 caracteres");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await repo.repoSearchVerses(bibleId, q);
      setResults(data.verses);
      setIsReference(!!data.isReference);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error en la búsqueda");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="desktop-page space-y-4 p-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">
          Buscar en la Biblia
        </h1>
        <p className="text-sm text-muted-foreground">
          Texto o referencia (ej. Juan 3:16). Offline: requiere versión
          descargada.
        </p>
      </header>

      <Card className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <select
            value={bibleId}
            onChange={(e) => setBibleId(Number(e.target.value))}
            className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
          >
            {bibles.map((b) => (
              <option key={b.bibleId} value={b.bibleId}>
                {b.abbr}
              </option>
            ))}
          </select>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Palabra o referencia…"
            className="min-w-[12rem] flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
          <Button onClick={search} loading={loading}>
            Buscar
          </Button>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </Card>

      {isReference && results.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Resultado por referencia bíblica
        </p>
      ) : null}

      <div className="space-y-3">
        {results.map((v) => (
          <Card
            key={`${v.bookId}-${v.chapter}-${v.verse}`}
            className="cursor-pointer transition-colors hover:bg-accent/50"
            onClick={() => onOpenVerse(v.bookId, v.chapter, bibleId)}
          >
            <p className="text-xs font-bold text-primary">
              {v.bookName} {v.chapter}:{v.verse}
            </p>
            <p className="mt-2 font-serif text-foreground">{v.text}</p>
          </Card>
        ))}
        {!loading && results.length === 0 && query.trim().length >= 2 ? (
          <p className="text-muted-foreground">Sin resultados.</p>
        ) : null}
      </div>
    </div>
  );
}
