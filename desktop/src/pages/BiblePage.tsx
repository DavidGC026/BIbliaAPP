import { useEffect, useState } from "react";
import { BibleReader } from "@/components/BibleReader";
import { BibleSearch } from "@/components/BibleSearch";
import { ReferencesExplorer } from "@/components/ReferencesExplorer";
import { StrongDictionary } from "@/components/StrongDictionary";
import { DownloadsPage } from "@/pages/DownloadsPage";
import type { BibleTarget } from "@/lib/types";

type BibleMode = "reader" | "search" | "references" | "dictionary" | "downloads";

const MODES: { key: BibleMode; label: string }[] = [
  { key: "reader", label: "Lector" },
  { key: "search", label: "Buscar" },
  { key: "references", label: "Referencias" },
  { key: "dictionary", label: "Diccionario" },
  { key: "downloads", label: "Descargas" },
];

type Props = {
  target?: BibleTarget;
  onTargetConsumed?: () => void;
};

export function BiblePage({ target, onTargetConsumed }: Props) {
  const [mode, setMode] = useState<BibleMode>("reader");
  const [readerTarget, setReaderTarget] = useState<BibleTarget | undefined>(target);

  useEffect(() => {
    if (!target) return;
    setReaderTarget(target);
    setMode("reader");
    onTargetConsumed?.();
  }, [target, onTargetConsumed]);

  function openInReader(bookId: number, chapter: number, bibleId?: number) {
    setReaderTarget({ bookId, chapter, bibleId });
    setMode("reader");
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex gap-1 border-b border-border bg-card/50 px-4 py-2">
        {MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setMode(m.key)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              mode === m.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {mode === "reader" && <BibleReader target={readerTarget} />}
        {mode === "search" && <BibleSearch onOpenVerse={openInReader} />}
        {mode === "references" && (
          <ReferencesExplorer
            onOpenReference={(bookId, chapter, bibleId) =>
              openInReader(bookId, chapter, bibleId)
            }
          />
        )}
        {mode === "dictionary" && <StrongDictionary />}
        {mode === "downloads" && <DownloadsPage />}
      </div>
    </div>
  );
}
