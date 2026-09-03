"use client"

import { memo } from "react"
import { FileText, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Verse } from "@/lib/types"
import type { ReaderLayout } from "@/lib/reader-preferences"
import { VerseCommentary, type VerseCommentaryEntry } from "./verse-commentary"

export type HighlightColor = "yellow" | "green" | "blue" | "orange" | "pink"

/**
 * Subrayado tipo marcador: pinta solo el texto, línea a línea
 * (`box-decoration-clone`), como un resaltador sobre el papel. Se aplica al
 * span del texto; el <li> queda libre para hover y selección.
 */
const HIGHLIGHT_TEXT_CLASSES: Record<HighlightColor, string> = {
  yellow: "bg-yellow-400/45 dark:bg-yellow-400/40",
  green: "bg-emerald-400/45 dark:bg-emerald-400/40",
  blue: "bg-sky-400/45 dark:bg-sky-400/40",
  orange: "bg-orange-400/45 dark:bg-orange-400/40",
  pink: "bg-pink-400/45 dark:bg-pink-400/40",
}

const MARKER_SHAPE_CLASSES = "box-decoration-clone rounded-[0.2em] px-[0.14em] -mx-[0.14em] py-[0.05em]"

export interface VerseTextProps {
  verse: Verse
  fontSize: number
  lineHeight: number
  textAlign: "left" | "justify"
  /** Composición del capítulo: versículos en bloque o texto corrido. */
  layout: ReaderLayout
  textColor?: string
  mutedColor?: string
  accentColor?: string
  hasNote: boolean
  highlightColor: string | undefined
  isSelected: boolean
  /** Versículo resaltado temporalmente (navegación desde búsqueda/deep link) */
  isFlashed: boolean
  /** Versículo que se está reproduciendo por audio / TTS */
  isSpeaking?: boolean
  isGuest: boolean
  /** Número de versículo cuya nota se está creando (deshabilita su botón) */
  isCreatingNote: boolean
  /** Hay una nota de cuaderno abierta: mostrar botón de insertar versículo */
  showInsertButton: boolean
  /**
   * Comentarios clásicos que cubren este versículo, ya cargados con el capítulo.
   * Sin comentarios (o con la opción desactivada) no se pinta nada.
   */
  commentaries?: VerseCommentaryEntry[]
  /** Color de borde del tema del lector, para el separador del comentario. */
  borderColor?: string
  onToggleSelect: (verseNum: number, shiftKey: boolean) => void
  onSetCurrent: (verseNum: number) => void
  onNote: (verse: Verse) => void
  onInsert: (verse: Verse) => void
}

/**
 * Renderizado de un versículo individual: estados visuales (subrayado tipo
 * marcador, selección, flash de navegación), selección por clic/shift y
 * acciones. En modo "paragraphs" el versículo fluye inline con su número en
 * superíndice; el versículo 1 abre el capítulo con capitular.
 *
 * Memoizado: en capítulos largos (Salmo 119 = 176 versículos) evita re-renderizar
 * todo el capítulo cuando cambia la selección de un solo versículo.
 */
export const VerseText = memo(function VerseText({
  verse: v,
  fontSize,
  lineHeight,
  textAlign,
  layout,
  textColor,
  mutedColor,
  accentColor,
  hasNote,
  highlightColor,
  isSelected,
  isFlashed,
  isSpeaking,
  isGuest,
  isCreatingNote,
  showInsertButton,
  commentaries,
  borderColor,
  onToggleSelect,
  onSetCurrent,
  onNote,
  onInsert,
}: VerseTextProps) {
  const verseNum = Number(v.verse)

  // Capitular: la primera letra del capítulo se agranda y el "1" desaparece,
  // como en las Biblias impresas. Solo si el texto empieza por letra.
  const dropCapMatch = verseNum === 1 ? v.text.match(/^(\p{L})([\s\S]*)$/u) : null
  const dropCap = dropCapMatch?.[1] ?? null
  const bodyText = dropCapMatch ? dropCapMatch[2] : v.text

  const markerClasses = highlightColor
    ? cn(MARKER_SHAPE_CLASSES, HIGHLIGHT_TEXT_CLASSES[highlightColor as HighlightColor])
    : undefined

  const handleSelect = (e: React.MouseEvent) => {
    onToggleSelect(verseNum, e.shiftKey)
    onSetCurrent(verseNum)
  }

  const handleDragStart = (e: React.DragEvent) => {
    const verseText = `${v.bookName} ${v.chapter}:${v.verse} — ${v.text}`
    e.dataTransfer.setData("text/plain", verseText)
    e.dataTransfer.effectAllowed = "copy"
  }

  const dropCapNode = dropCap ? (
    <span
      aria-hidden="true"
      className="verse-dropcap"
      style={accentColor ? { color: accentColor } : undefined}
    >
      {dropCap}
    </span>
  ) : null

  const ariaLabel = `Versículo ${v.bookName} ${v.chapter}:${v.verse}. ${v.text}`
  const commentaryNode = commentaries && commentaries.length > 0 ? (
    <VerseCommentary
      commentaries={commentaries}
      fontSize={fontSize}
      mutedColor={mutedColor}
      accentColor={accentColor}
      borderColor={borderColor}
    />
  ) : null

  if (layout === "paragraphs") {
    return (
      <li id={`verse-${v.verse}`} className="inline">
        <button
          type="button"
          draggable
          onClick={handleSelect}
          onDragStart={handleDragStart}
          aria-pressed={isSelected}
          aria-label={ariaLabel}
          className="inline cursor-pointer text-left focus-visible:outline-none"
        >
          {!dropCap && (
            <sup
              aria-hidden="true"
              className="mx-[0.3em] align-super font-sans text-[0.58em] font-bold text-primary"
              style={accentColor ? { color: accentColor } : undefined}
            >
              {v.verse}
            </sup>
          )}
          <span
            className={cn(
              "box-decoration-clone rounded-[0.2em] font-serif text-foreground transition-colors duration-300 text-pretty",
              textAlign === "justify" && "hyphens-auto",
              "hover:bg-accent/45",
              markerClasses,
              isSelected && "underline decoration-primary/70 decoration-[0.12em] underline-offset-[0.22em]",
              isSelected && !highlightColor && "bg-primary/15 dark:bg-primary/25",
              isSpeaking && cn(MARKER_SHAPE_CLASSES, "bg-emerald-500/20 dark:bg-emerald-400/25"),
              isFlashed && cn(MARKER_SHAPE_CLASSES, "bg-yellow-500/30 dark:bg-yellow-400/30"),
            )}
            style={{ fontSize: `${fontSize}px`, lineHeight, textAlign, color: textColor }}
          >
            {dropCapNode}
            {bodyText}
          </span>
          {hasNote && (
            <FileText
              aria-hidden="true"
              className="ml-[0.2em] inline size-[0.62em] align-super text-primary"
              style={accentColor ? { color: accentColor } : undefined}
            />
          )}
        </button>
        {" "}
        {commentaryNode}
      </li>
    )
  }

  return (
    <li
      id={`verse-${v.verse}`}
      className={cn(
        "group rounded-md px-2 py-1 transition-all duration-300 hover:bg-accent/40",
        hasNote && "bg-accent/30",
        isSelected && "ring-2 ring-primary bg-primary/5 dark:bg-primary/10",
        isSpeaking && "ring-2 ring-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/15 shadow-sm scale-[1.01]",
        isFlashed && "bg-yellow-500/15 dark:bg-yellow-500/10 ring-2 ring-yellow-500/80 scale-[1.01] shadow-sm",
      )}
    >
      {/* El versículo y sus acciones van en fila; el comentario, debajo. */}
      <div className="flex gap-2">
        <button
          type="button"
          draggable
          onClick={handleSelect}
          onDragStart={handleDragStart}
          aria-pressed={isSelected}
          aria-label={ariaLabel}
          className="flex min-w-0 flex-1 cursor-grab gap-3 rounded-md px-1 py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:cursor-grabbing"
        >
          {!dropCap && (
            <span
              aria-hidden="true"
              className="mt-1.5 select-none font-serif font-semibold oldstyle-nums text-primary"
              style={{ fontSize: `${Math.max(12, fontSize - 6)}px`, color: accentColor }}
            >
              {v.verse}
            </span>
          )}
          <span
            className={cn(
              "flex-1 select-none font-serif leading-relaxed text-foreground text-pretty",
              textAlign === "justify" && "hyphens-auto",
              markerClasses,
            )}
            style={{ fontSize: `${fontSize}px`, lineHeight, textAlign, color: textColor }}
          >
            {dropCapNode}
            {bodyText}
          </span>
        </button>
        <div className="mt-1 flex items-center gap-1.5">
          {showInsertButton && (
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                onInsert(v)
              }}
              draggable={false}
              title="Insertar versículo en la nota de cuaderno activa"
              aria-label="Insertar versículo"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20 dark:text-emerald-400 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 transition-colors"
            >
              <Plus className="size-4 font-bold" />
            </button>
          )}
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              onNote(v)
            }}
            draggable={false}
            disabled={isCreatingNote}
            aria-label={isGuest ? "Inicia sesión para añadir nota" : hasNote ? "Ver nota" : "Añadir nota"}
            className={cn(
              "inline-flex size-8 shrink-0 items-center justify-center rounded-md transition-colors",
              isGuest
                ? "text-muted-foreground/60 hover:text-primary hover:bg-primary/10"
                : hasNote
                  ? "text-primary hover:bg-primary/10"
                  : "text-muted-foreground/80 hover:text-foreground hover:bg-accent",
            )}
            style={mutedColor && !hasNote ? { color: mutedColor } : undefined}
          >
            {isGuest ? <FileText className="size-4" /> : hasNote ? <FileText className="size-4" /> : <Plus className="size-4" />}
          </button>
        </div>
      </div>

      {commentaryNode}
    </li>
  )
})
