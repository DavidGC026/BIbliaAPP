import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import * as api from "@/lib/api";
import { parseDictionaryDefinition } from "@/lib/dictionary";
import type { StrongEntry } from "@/lib/types";

type Lang = "all" | "greek" | "hebrew";

const LANG_OPTIONS: { id: Lang; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "greek", label: "Griego" },
  { id: "hebrew", label: "Hebreo" },
];

type Props = {
  open: boolean;
  onClose: () => void;
  onInsert: (entry: StrongEntry) => void;
};

export function InsertDictionaryModal({ open, onClose, onInsert }: Props) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [lang, setLang] = useState<Lang>("all");
  const [page, setPage] = useState(1);
  const [browse, setBrowse] = useState(false);
  const [entries, setEntries] = useState<StrongEntry[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    setPage(1);
  }, [debounced, lang, browse, open]);

  const hasValidQuery = debounced.length >= 2 || /^[gh]\d+$/i.test(debounced);
  const shouldFetch = open && (hasValidQuery || browse);

  useEffect(() => {
    if (!shouldFetch) {
      setEntries([]);
      return;
    }
    setLoading(true);
    setError(null);
    api
      .searchDictionary({ q: debounced, lang, page, browse: browse && !hasValidQuery })
      .then((data) => {
        setEntries(data.entries);
        setTotalPages(data.totalPages);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error"))
      .finally(() => setLoading(false));
  }, [debounced, lang, page, browse, shouldFetch, hasValidQuery]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="font-bold text-foreground">Insertar del diccionario</h2>
          <button type="button" onClick={onClose} className="text-sm text-muted-foreground">
            Cerrar
          </button>
        </div>

        <div className="space-y-3 border-b border-border p-4">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value) setBrowse(false);
            }}
            placeholder="G25, agapao, H430…"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            autoFocus
          />
          <div className="flex gap-2">
            {LANG_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setLang(opt.id)}
                className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-semibold ${
                  lang === opt.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {!shouldFetch ? (
            <Button variant="outline" onClick={() => setBrowse(true)}>
              Explorar diccionario
            </Button>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="text-muted-foreground">Buscando…</p>
          ) : entries.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">
              {error ?? (shouldFetch ? "Sin resultados." : "Escribe al menos 2 caracteres.")}
            </p>
          ) : (
            <div className="space-y-2">
              {entries.map((item) => {
                const preview =
                  parseDictionaryDefinition(item.definition)[0]?.text ?? item.definition;
                return (
                  <Card
                    key={item.strongCode}
                    className="cursor-pointer hover:bg-accent/50"
                    onClick={() => {
                      onInsert(item);
                      onClose();
                    }}
                  >
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="font-extrabold text-primary">{item.strongCode}</span>
                      <span className="font-semibold">{item.lemma}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{preview}</p>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-border p-3">
            <Button variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              ←
            </Button>
            <span className="text-xs text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button
              variant="ghost"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              →
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
