import { useEffect, useState } from "react";
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

const EXAMPLES = ["G25", "H430", "agapao", "shalom", "logos"];

export function StrongDictionary() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [lang, setLang] = useState<Lang>("all");
  const [page, setPage] = useState(1);
  const [browse, setBrowse] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [entries, setEntries] = useState<StrongEntry[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [debounced, lang, browse]);

  const hasValidQuery = debounced.length >= 2 || /^[gh]\d+$/i.test(debounced);
  const shouldFetch = hasValidQuery || browse;

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
        setTotal(data.total);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error"))
      .finally(() => setLoading(false));
  }, [debounced, lang, page, browse, shouldFetch, hasValidQuery]);

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-6">
      <header>
        <h2 className="text-xl font-bold text-foreground">Diccionario Strong</h2>
        <p className="text-sm text-muted-foreground">
          Códigos Strong, palabras en griego y hebreo.
        </p>
      </header>

      <Card className="space-y-3">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value) setBrowse(false);
          }}
          placeholder="G25, agapao, shalom, H430…"
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="flex gap-2">
          {LANG_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setLang(opt.id)}
              className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold ${
                lang === opt.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </Card>

      {!shouldFetch ? (
        <Card className="space-y-4 text-center">
          <p className="font-semibold text-foreground">Busca por código Strong o palabra</p>
          <div className="flex flex-wrap justify-center gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setQuery(ex)}
                className="rounded-full border border-border px-3 py-1 text-sm font-semibold text-primary"
              >
                {ex}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setBrowse(true)}
            className="rounded-lg border border-primary px-4 py-2 text-sm font-bold text-primary"
          >
            Explorar diccionario
          </button>
        </Card>
      ) : (
        <>
          <p className="text-sm font-semibold text-muted-foreground">
            {loading ? "Buscando…" : `${total} entradas`}
          </p>

          {loading ? (
            <p className="text-muted-foreground">Cargando…</p>
          ) : entries.length === 0 ? (
            <p className="text-center text-muted-foreground">{error ?? "Sin resultados."}</p>
          ) : (
            <div className="space-y-2">
              {entries.map((item) => {
                const open = expanded === item.strongCode;
                const sections = parseDictionaryDefinition(item.definition);
                return (
                  <Card key={item.strongCode} className="cursor-pointer" onClick={() => setExpanded(open ? null : item.strongCode)}>
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-base font-extrabold text-primary">{item.strongCode}</span>
                      <span className="font-semibold text-foreground">{item.lemma}</span>
                      <span className="text-sm text-muted-foreground">{item.transliteration}</span>
                    </div>
                    {open ? (
                      <div className="mt-3 space-y-3 border-t border-border pt-3">
                        {sections.length > 0
                          ? sections.map((s, i) => (
                              <div key={i}>
                                {s.label ? (
                                  <p className="text-xs font-bold text-primary">{s.label}</p>
                                ) : null}
                                <p className="text-sm leading-relaxed text-foreground">{s.text}</p>
                              </div>
                            ))
                          : (
                            <p className="text-sm leading-relaxed text-foreground">{item.definition}</p>
                          )}
                      </div>
                    ) : null}
                  </Card>
                );
              })}
            </div>
          )}

          {totalPages > 1 ? (
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-primary disabled:opacity-40"
              >
                ← Anterior
              </button>
              <span className="text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-primary disabled:opacity-40"
              >
                Siguiente →
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
