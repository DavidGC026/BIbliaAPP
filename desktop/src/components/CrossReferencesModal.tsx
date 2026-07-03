import { useEffect, useState } from "react";
import * as api from "@/lib/api";
import type { CrossReference } from "@/lib/types";

type Props = {
  open: boolean;
  bibleId: number;
  bookId: number | null;
  chapter: number;
  verse: number | null;
  reference: string;
  onClose: () => void;
  onOpenReference?: (bookId: number, chapter: number) => void;
};

export function CrossReferencesModal({
  open,
  bibleId,
  bookId,
  chapter,
  verse,
  reference,
  onClose,
  onOpenReference,
}: Props) {
  const [refs, setRefs] = useState<CrossReference[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !bookId || verse === null) return;
    setLoading(true);
    setError(null);
    api
      .getCrossReferences(bibleId, bookId, chapter, verse)
      .then(({ references }) => setRefs(references))
      .catch((err) => setError(err instanceof Error ? err.message : "Error"))
      .finally(() => setLoading(false));
  }, [open, bibleId, bookId, chapter, verse]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-xl border border-border bg-card shadow-xl sm:rounded-xl">
        <div className="flex items-start justify-between gap-3 border-b border-border p-4">
          <div>
            <h2 className="text-lg font-extrabold text-foreground">Referencias cruzadas</h2>
            <p className="text-sm font-semibold text-primary">{reference}</p>
          </div>
          <button type="button" onClick={onClose} className="text-sm font-semibold text-muted-foreground">
            Cerrar
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="text-muted-foreground">Cargando…</p>
          ) : refs.length === 0 ? (
            <p className="text-center text-muted-foreground">
              {error ?? "No hay referencias cruzadas para este versículo."}
            </p>
          ) : (
            <div className="space-y-2">
              {refs.map((item, i) => (
                <button
                  key={`${item.book_id}-${item.chapter}-${item.verse}-${i}`}
                  type="button"
                  className="w-full rounded-xl border border-border bg-background p-3 text-left hover:bg-accent/50"
                  onClick={() => {
                    onOpenReference?.(item.book_id, item.chapter);
                    onClose();
                  }}
                >
                  <p className="font-bold text-primary">
                    {item.book_name} {item.chapter}:{item.verse}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-foreground">{item.text}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
