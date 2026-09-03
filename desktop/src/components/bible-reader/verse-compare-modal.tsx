import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import * as repo from "@/lib/repo";
import type { BibleVersion, Verse } from "@/lib/types";

interface VerseCompareModalProps {
  isOpen: boolean;
  bookId: number;
  bookName: string;
  chapter: number;
  verseNumber: number;
  bibles: BibleVersion[];
  onClose: () => void;
}

interface VersionVerseResult {
  bible: BibleVersion;
  verseText: string | null;
  loading: boolean;
  error?: string;
}

export function VerseCompareModal({
  isOpen,
  bookId,
  bookName,
  chapter,
  verseNumber,
  bibles,
  onClose,
}: VerseCompareModalProps) {
  const [results, setResults] = useState<VersionVerseResult[]>([]);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen || !bibles.length) return;

    // Initialize loading state for all bibles
    setResults(
      bibles.map((b) => ({
        bible: b,
        verseText: null,
        loading: true,
      })),
    );

    // Fetch verses in parallel for all versions
    bibles.forEach((b) => {
      repo
        .repoGetVerses(b.bibleId, bookId, chapter)
        .then((res) => {
          const match = res.verses.find(
            (v: Verse) => Number(v.verse) === verseNumber,
          );
          setResults((prev) =>
            prev.map((item) =>
              item.bible.bibleId === b.bibleId
                ? {
                    ...item,
                    verseText: match?.text ?? "Versículo no encontrado en esta versión.",
                    loading: false,
                  }
                : item,
            ),
          );
        })
        .catch((err) => {
          setResults((prev) =>
            prev.map((item) =>
              item.bible.bibleId === b.bibleId
                ? {
                    ...item,
                    verseText: null,
                    loading: false,
                    error:
                      err instanceof Error
                        ? err.message
                        : "No disponible offline",
                  }
                : item,
            ),
          );
        });
    });
  }, [isOpen, bookId, chapter, verseNumber, bibles]);

  if (!isOpen) return null;

  const handleCopy = async (b: BibleVersion, text: string) => {
    const formatted = `«${text}»\n— ${bookName} ${chapter}:${verseNumber} (${b.abbr})`;
    await navigator.clipboard.writeText(formatted);
    setCopiedId(b.bibleId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border/60 bg-card p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon name="compare" size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                Comparar Versiones
              </h2>
              <p className="text-xs text-muted-foreground font-serif">
                {bookName} {chapter}:{verseNumber}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* Modal Body: Versions comparison cards grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map(({ bible, verseText, loading, error }) => (
              <Card
                key={bible.bibleId}
                className="p-4 space-y-3 border-border/80 hover:border-primary/40 transition-all flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                      {bible.abbr}
                    </span>
                    <span className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                      {bible.name}
                    </span>
                  </div>

                  {loading ? (
                    <p className="text-xs text-muted-foreground animate-pulse py-2">
                      Cargando traducción…
                    </p>
                  ) : error ? (
                    <p className="text-xs text-destructive/80 italic py-2">
                      {error}
                    </p>
                  ) : (
                    <p className="font-serif text-sm leading-relaxed text-foreground">
                      {verseText}
                    </p>
                  )}
                </div>

                {!loading && verseText && (
                  <div className="flex justify-end pt-2 border-t border-border/40">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(bible, verseText)}
                      className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Icon
                        name={copiedId === bible.bibleId ? "check" : "copy"}
                        size={13}
                      />
                      <span>
                        {copiedId === bible.bibleId ? "Copiado" : "Copiar"}
                      </span>
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border/60 bg-muted/20 p-3 sm:px-6 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}
