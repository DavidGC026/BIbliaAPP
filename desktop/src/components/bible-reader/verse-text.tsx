import { memo } from "react";
import { Icon } from "@/components/ui/Icon";
import type { ReaderLayout } from "@/lib/preferences";
import type {
  InterlinearWordView,
  Verse,
  VerseCommentaryEntry,
} from "@/lib/types";
import { InterlinearPanel } from "./interlinear-panel";
import { VerseCommentary } from "./verse-commentary";

export interface VerseTextProps {
  verse: Verse;
  fontSize: number;
  lineHeight: number;
  textAlign: "left" | "justify";
  layout: ReaderLayout;
  textColor?: string;
  mutedColor?: string;
  accentColor?: string;
  borderColor?: string;
  hasNote?: boolean;
  highlightColor?: string | null;
  isSelected?: boolean;
  isFlashed?: boolean;
  isSpeaking?: boolean;
  canAnnotate?: boolean;
  commentaries?: VerseCommentaryEntry[];
  interlinearWords?: InterlinearWordView[];
  onToggleSelect: (verseNumber: number, isShiftKey: boolean) => void;
  onSetCurrent: (verseNumber: number) => void;
  onNote: (verseNumber: number) => void;
  onCrossReferences: (verse: Verse) => void;
}

const MARKER_BG_CLASSES: Record<string, string> = {
  yellow:
    "bg-yellow-400/40 text-neutral-900 dark:bg-yellow-400/35 dark:text-neutral-50",
  green:
    "bg-emerald-400/40 text-neutral-900 dark:bg-emerald-400/35 dark:text-neutral-50",
  blue: "bg-sky-400/40 text-neutral-900 dark:bg-sky-400/35 dark:text-neutral-50",
  orange:
    "bg-amber-400/40 text-neutral-900 dark:bg-amber-400/35 dark:text-neutral-50",
  pink: "bg-rose-400/40 text-neutral-900 dark:bg-rose-400/35 dark:text-neutral-50",
};

const MARKER_SHAPE_CLASSES =
  "box-decoration-clone rounded-[0.2em] px-[0.14em] -mx-[0.14em] py-[0.05em]";

export const VerseText = memo(function VerseText({
  verse: v,
  fontSize,
  lineHeight,
  textAlign,
  layout,
  textColor,
  mutedColor,
  accentColor,
  borderColor,
  hasNote,
  highlightColor,
  isSelected,
  isFlashed,
  isSpeaking,
  canAnnotate: _canAnnotate,
  commentaries,
  interlinearWords,

  onToggleSelect,
  onSetCurrent,
  onNote,
  onCrossReferences,
}: VerseTextProps) {
  const verseNum = Number(v.verse);

  const markerClasses = highlightColor
    ? `${MARKER_SHAPE_CLASSES} ${MARKER_BG_CLASSES[highlightColor] || "bg-yellow-400/45"}`
    : undefined;

  const handleSelect = (e: React.MouseEvent) => {
    onToggleSelect(verseNum, e.shiftKey);
    onSetCurrent(verseNum);
  };

  // --------------------------------------------------------------------------
  // MODO PÁRRAFOS (Texto continuo con capitular en v1)
  // --------------------------------------------------------------------------
  if (layout === "paragraphs") {
    // Solo en modo párrafos se extrae la letra capitular del versículo 1
    const dropCapMatch =
      verseNum === 1 ? v.text.match(/^(\p{L})([\s\S]*)$/u) : null;
    const dropCap = dropCapMatch?.[1] ?? null;
    const bodyText = dropCapMatch ? dropCapMatch[2] : v.text;

    return (
      <li
        id={`verse-${verseNum}`}
        data-verse={verseNum}
        className="inline relative"
      >
        <button
          type="button"
          onClick={handleSelect}
          aria-label={`Versículo ${verseNum}: ${v.text}`}
          className={`inline rounded transition-colors text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
            isSelected
              ? "underline decoration-primary decoration-2 underline-offset-4"
              : ""
          } ${
            isSpeaking
              ? "ring-2 ring-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-md px-1"
              : ""
          } ${isFlashed ? "bg-primary/20 ring-2 ring-primary" : ""}`}
          style={{
            fontSize: `${fontSize}px`,
            lineHeight,
            color: textColor,
            textAlign,
          }}
        >
          {dropCap && (
            <span
              aria-hidden="true"
              className="verse-dropcap select-none font-serif"
              style={accentColor ? { color: accentColor } : undefined}
            >
              {dropCap}
            </span>
          )}

          {/* Número de versículo en superíndice (salvo capitular v1) */}
          {!dropCap && (
            <sup
              className="mr-1 select-none font-sans text-[0.68em] font-bold text-primary/80"
              style={accentColor ? { color: accentColor } : undefined}
            >
              {verseNum}
            </sup>
          )}

          <span className={markerClasses}>{bodyText}</span>

          {hasNote && (
            <sup
              className="ml-0.5 inline-flex align-super text-primary select-none"
              title="Este versículo tiene notas"
            >
              <Icon name="notes" size={11} />
            </sup>
          )}
        </button>
        {/* Espacio real de separación entre versículos para saltos de línea naturales */}
        <span className="select-none"> </span>

        {interlinearWords && interlinearWords.length > 0 && (
          <div className="my-2 block clear-both">
            <InterlinearPanel
              words={interlinearWords}
              fontSize={fontSize}
              mutedColor={mutedColor}
              accentColor={accentColor}
              borderColor={borderColor}
            />
          </div>
        )}

        {/* Comentarios bíblicos rompen el inline como bloque propio */}
        {commentaries && commentaries.length > 0 && (
          <div className="my-2 block clear-both">
            <VerseCommentary
              commentaries={commentaries}
              fontSize={fontSize}
              mutedColor={mutedColor}
              accentColor={accentColor}
              borderColor={borderColor}
            />
          </div>
        )}
      </li>
    );
  }

  // --------------------------------------------------------------------------
  // MODO VERSÍCULOS (Filas individuales limpias por versículo)
  // --------------------------------------------------------------------------
  return (
    <li
      id={`verse-${verseNum}`}
      data-verse={verseNum}
      className={`group relative rounded-xl transition-all duration-150 ${
        isSelected
          ? "bg-primary/10 ring-2 ring-primary shadow-sm"
          : "hover:bg-accent/40"
      } ${
        isSpeaking
          ? "ring-2 ring-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/15 shadow-sm scale-[1.008]"
          : ""
      } ${isFlashed ? "bg-primary/20 ring-2 ring-primary" : ""}`}
    >
      <button
        type="button"
        onClick={handleSelect}
        aria-label={`Versículo ${verseNum}: ${v.text}`}
        className="w-full text-left p-2.5 sm:p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
        style={{
          fontSize: `${fontSize}px`,
          lineHeight,
          color: textColor,
          textAlign,
        }}
      >
        <div className="flex items-start gap-3">
          {/* Número de versículo fijo a la izquierda */}
          <span
            className="mt-0.5 min-w-[2rem] shrink-0 font-serif text-xs font-bold text-primary/75 select-none tabular-nums"
            style={accentColor ? { color: accentColor } : undefined}
          >
            {verseNum}
          </span>

          <div className="min-w-0 flex-1 leading-relaxed">
            <span className={markerClasses}>{v.text}</span>
          </div>

          {/* Quick inline note indicator / action button */}
          <div className="flex shrink-0 items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
            {hasNote && (
              <span
                className="rounded p-1 text-primary hover:bg-primary/10 transition-colors"
                title="Ver nota de este versículo"
                onClick={(e) => {
                  e.stopPropagation();
                  onNote(verseNum);
                }}
              >
                <Icon name="notes" size={14} />
              </span>
            )}
            <span
              className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
              title="Referencias cruzadas"
              onClick={(e) => {
                e.stopPropagation();
                onCrossReferences(v);
              }}
            >
              <Icon name="sparkles" size={14} />
            </span>
          </div>
        </div>
      </button>

      {interlinearWords && interlinearWords.length > 0 && (
        <div className="px-3 pb-2">
          <InterlinearPanel
            words={interlinearWords}
            fontSize={fontSize}
            mutedColor={mutedColor}
            accentColor={accentColor}
            borderColor={borderColor}
          />
        </div>
      )}

      {/* Comentarios bíblicos debajo del versículo */}
      {commentaries && commentaries.length > 0 && (
        <div className="px-3 pb-3">
          <VerseCommentary
            commentaries={commentaries}
            fontSize={fontSize}
            mutedColor={mutedColor}
            accentColor={accentColor}
            borderColor={borderColor}
          />
        </div>
      )}
    </li>
  );
});
