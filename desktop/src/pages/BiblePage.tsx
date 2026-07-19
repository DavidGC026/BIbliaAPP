import { useEffect, useState } from "react";
import { BibleReader } from "@/components/BibleReader";
import { BibleSearch } from "@/components/BibleSearch";
import { ReferencesExplorer } from "@/components/ReferencesExplorer";
import { StrongDictionary } from "@/components/StrongDictionary";
import { DownloadsPage } from "@/pages/DownloadsPage";
import type { BibleTarget } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import { parseAllowedSections } from "@/lib/nav";

type BibleMode =
  | "reader"
  | "search"
  | "references"
  | "dictionary"
  | "downloads";

const MODES: { key: BibleMode; label: string; section: string }[] = [
  { key: "reader", label: "Lector", section: "reading" },
  { key: "search", label: "Buscar", section: "search" },
  { key: "references", label: "Referencias", section: "references" },
  { key: "dictionary", label: "Diccionario", section: "dictionary" },
  { key: "downloads", label: "Descargas", section: "reading" },
];

type Props = {
  target?: BibleTarget;
  onTargetConsumed?: () => void;
};

export function BiblePage({ target, onTargetConsumed }: Props) {
  const { user } = useAuth();
  const [mode, setMode] = useState<BibleMode>("reader");
  const [readerTarget, setReaderTarget] = useState<BibleTarget | undefined>(
    target,
  );
  const allowed = parseAllowedSections(user?.allowedSections);
  const visibleModes = MODES.filter(
    (item) =>
      user?.role === "admin" || !allowed || allowed.includes(item.section),
  );

  useEffect(() => {
    if (!visibleModes.some((item) => item.key === mode) && visibleModes[0])
      setMode(visibleModes[0].key);
  }, [mode, user?.role, user?.allowedSections]);

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
        {visibleModes.map((m) => (
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
