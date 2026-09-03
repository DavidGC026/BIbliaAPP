import { Button } from "@/components/ui/Button";
import type { BibleVersion, Book } from "@/lib/types";

export interface VersionSelectorProps {
  bibles: BibleVersion[];
  selectedBibleId: number;
  onBibleChange: (bibleId: number) => void;
  books: Book[];
  selectedBookId: number | null;
  onBookChange: (bookId: number) => void;
  chapter: number;
  maxChapter: number;
  onChapterChange: (chapter: number) => void;
  disabled?: boolean;
}

const SELECT_BASE =
  "h-9 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs sm:text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors";

export function VersionSelector({
  bibles,
  selectedBibleId,
  onBibleChange,
  books,
  selectedBookId,
  onBookChange,
  chapter,
  maxChapter,
  onChapterChange,
  disabled = false,
}: VersionSelectorProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Selector de versión */}
      <select
        value={selectedBibleId}
        onChange={(e) => onBibleChange(Number(e.target.value))}
        disabled={disabled}
        className={`max-w-[140px] sm:max-w-[190px] truncate ${SELECT_BASE}`}
        title="Versión de la Biblia"
      >
        {bibles.map((b) => (
          <option key={b.bibleId} value={b.bibleId}>
            {b.abbr} — {b.name}
          </option>
        ))}
      </select>

      {/* Selector de libro */}
      <select
        value={selectedBookId ?? ""}
        onChange={(e) => onBookChange(Number(e.target.value))}
        disabled={disabled}
        className={`max-w-[130px] sm:max-w-[170px] truncate ${SELECT_BASE}`}
        title="Libro"
      >
        {books.map((b) => (
          <option key={b.bookId} value={b.bookId}>
            {b.bookName}
          </option>
        ))}
      </select>

      {/* Selector de capítulo con flechas de avance/retroceso */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={chapter <= 1 || disabled}
          onClick={() => onChapterChange(Math.max(1, chapter - 1))}
          className="size-9 p-0 text-foreground"
          title="Capítulo anterior"
        >
          ‹
        </Button>

        <select
          value={chapter}
          onChange={(e) => onChapterChange(Number(e.target.value))}
          disabled={disabled}
          className={`w-[68px] text-center ${SELECT_BASE}`}
          title="Capítulo"
        >
          {Array.from({ length: maxChapter }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              Cap. {n}
            </option>
          ))}
        </select>

        <Button
          variant="outline"
          size="sm"
          disabled={chapter >= maxChapter || disabled}
          onClick={() => onChapterChange(Math.min(maxChapter, chapter + 1))}
          className="size-9 p-0 text-foreground"
          title="Capítulo siguiente"
        >
          ›
        </Button>
      </div>
    </div>
  );
}
