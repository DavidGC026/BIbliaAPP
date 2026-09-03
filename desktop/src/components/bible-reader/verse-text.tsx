import { memo } from "react";
import { Icon } from "@/components/ui/Icon";
import type { ReaderLayout } from "@/lib/preferences";
import type { Verse, VerseCommentaryEntry } from "@/lib/types";
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
  hasNote: boolean;
  highlightColor?: string;
  isSelected: boolean;
  isFlashed: boolean;
  isSpeaking?: boolean;
  canAnnotate: boolean;
  commentaries?: VerseCommentaryEntry[];
  onToggleSelect: (verseNum: number, shiftKey: boolean) => void;
  onSetCurrent: (verseNum: number) => void;
  onNote?: (verse: Verse) => void;
  onCrossReferences?: (verse: Verse) => void;
}

const MARKER_BG_CLASSES: Record<string, string> = {
  yellow: "bg-yellow-400/45 dark:bg-yellow-400/40",
  green: "bg-emerald-400/45 dark:bg-emerald-400/40",
  blue: "bg-sky-400/45 dark:bg-sky-400/40",
  orange: "bg-orange-400/45 dark:bg-orange-400/40",
  pink: "bg-pink-400/45 dark:bg-pink-400/40",
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
  canAnnotate,
  commentaries,
  onToggleSelect,
  onSetCurrent,
  onNote,
  onCrossReferences,
}: VerseTextProps) {
  const verseNum = Number(v.verse);

  // Capitular en versículo 1 si empieza con letra
  const dropCapMatch =
    verseNum === 1 ? v.text.match(/^(\p{L})([\s\S]*)$/u) : null;
  const dropCap = dropCapMatch?.[1] ?? null;
  const bodyText = dropCapMatch ? dropCapMatch[2] : v.text;

  const markerClasses = highlightColor
    ? `${MARKER_SHAPE_CLASSES} ${MARKER_BG_CLASSES[highlightColor] || "bg-yellow-400/45"}`
    : undefined;

  const handleSelect = (e: React.MouseEvent) => {
    onToggleSelect(verseNum, e.shiftKey);
    onSetCurrent(verseNum);
  };

  const dropCapNode = dropCap ? (
    <span
      aria-hidden="true"
      className="verse-dropcap select-none font-serif"
      style={accentColor ? { color: accentColor } : undefined}
    >
      {dropCap}
    </span>
  ) : null;

  // --------------------------------------------------------------------------
  // MODO PÁRRAFOS (Texto continuo)
  // --------------------------------------------------------------------------
  if (layout === "paragraphs") {
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
          {dropCapNode}
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
  // MODO VERSÍCULOS (Bloques individuales por versículo)
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
        <div className="flex items-start gap-2.5">
          {/* Número de versículo */}
          {!dropCap ? (
            <span
              className="mt-0.5 min-w-[1.8rem] shrink-0 font-serif text-xs font-semibold text-primary/70 select-none tabular-nums"
              style={accentColor ? { color: accentColor } : undefined}
            >
              {verseNum}
            </span>
          ) : null}

          <div className="min-w-0 flex-1 leading-relaxed">
            {dropCapNode}
            <span className={markerClasses}>{bodyText}</span>
          </div>

          {/* Quick inline note indicator / action button */}
          <div className="flex shrink-0 items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
            {hasNote && (
              <span
                className="flex size-7 items-center justify-center rounded-lg text-primary bg-primary/10"
                title="Tiene notas de versículo"
              >
                <Icon name="notes" size={14} />
              </span>
            )}
            {canAnnotate && onNote && !hasNote && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onNote(v);
                }}
                className="hidden sm:inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
                title="Añadir nota"
              >
                <Icon name="notes" size={14} />
              </span>
            )}
            {onCrossReferences && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onCrossReferences(v);
                }}
                className="hidden sm:inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
                title="Referencias cruzadas"
              >
                <Icon name="sparkles" size={14} />
              </span>
            )}
          </div>
        </div>

        {/* Comentarios bíblicos debajo del versículo */}
        {commentaries && commentaries.length > 0 && (
          <div className="mt-2 pl-7">
            <VerseCommentary
              commentaries={commentaries}
              fontSize={fontSize}
              mutedColor={mutedColor}
              accentColor={accentColor}
              borderColor={borderColor}
            />
          </div>
        )}
      </button>
    </li>
  );
});
