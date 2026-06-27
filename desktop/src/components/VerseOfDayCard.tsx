import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { getVerseOfDay } from "@/lib/api";
import type { VerseOfDay } from "@/lib/types";

export function VerseOfDayCard() {
  const [verse, setVerse] = useState<VerseOfDay | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getVerseOfDay()
      .then(setVerse)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "No se pudo cargar"),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card className="relative overflow-hidden">
      <p className="text-xs font-bold uppercase tracking-wider text-primary">
        Versículo del día
      </p>
      {loading ? (
        <p className="mt-3 text-muted-foreground">Cargando…</p>
      ) : error ? (
        <p className="mt-3 text-destructive text-sm">{error}</p>
      ) : verse ? (
        <>
          {verse.theme ? (
            <p className="mt-1 text-sm text-muted-foreground">{verse.theme}</p>
          ) : null}
          <blockquote className="mt-4 font-serif text-lg leading-relaxed text-foreground">
            “{verse.text}”
          </blockquote>
          <p className="mt-3 text-sm font-semibold text-primary">
            {verse.reference}
          </p>
        </>
      ) : null}
    </Card>
  );
}
