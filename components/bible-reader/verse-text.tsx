"use client"

import { memo } from "react"
import { FileText, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Verse } from "@/lib/types"

export type HighlightColor = "yellow" | "green" | "blue" | "orange" | "pink"

const HIGHLIGHT_CLASSES: Record<HighlightColor, string> = {
  yellow: "bg-yellow-500/10 dark:bg-yellow-500/20 border-l-4 border-yellow-500 rounded-l-none pl-2",
  green: "bg-emerald-500/10 dark:bg-emerald-500/20 border-l-4 border-emerald-500 rounded-l-none pl-2",
  blue: "bg-sky-500/10 dark:bg-sky-500/20 border-l-4 border-sky-500 rounded-l-none pl-2",
  orange: "bg-orange-500/10 dark:bg-orange-500/20 border-l-4 border-orange-500 rounded-l-none pl-2",
  pink: "bg-pink-500/10 dark:bg-pink-500/20 border-l-4 border-pink-500 rounded-l-none pl-2",
}

export interface VerseTextProps {
  verse: Verse
  fontSize: number
  hasNote: boolean
  highlightColor: string | undefined
  isSelected: boolean
  /** Versículo resaltado temporalmente (navegación desde búsqueda/deep link) */
  isFlashed: boolean
  isGuest: boolean
  /** Número de versículo cuya nota se está creando (deshabilita su botón) */
  isCreatingNote: boolean
  /** Hay una nota de cuaderno abierta: mostrar botón de insertar versículo */
  showInsertButton: boolean
  onToggleSelect: (verseNum: number, shiftKey: boolean) => void
  onSetCurrent: (verseNum: number) => void
  onNote: (verse: Verse) => void
  onInsert: (verse: Verse) => void
}

/**
 * Renderizado de un versículo individual: estados visuales (subrayados por
 * color, selección, flash de navegación), selección por clic/shift y acciones.
 *
 * Memoizado: en capítulos largos (Salmo 119 = 176 versículos) evita re-renderizar
 * todo el capítulo cuando cambia la selección de un solo versículo.
 */
export const VerseText = memo(function VerseText({
  verse: v,
  fontSize,
  hasNote,
  highlightColor,
  isSelected,
  isFlashed,
  isGuest,
  isCreatingNote,
  showInsertButton,
  onToggleSelect,
  onSetCurrent,
  onNote,
  onInsert,
}: VerseTextProps) {
  const verseNum = Number(v.verse)

  return (
    <li
      id={`verse-${v.verse}`}
      onClick={() => onSetCurrent(verseNum)}
      draggable={true}
      onDragStart={(e) => {
        const verseText = `${v.bookName} ${v.chapter}:${v.verse} — ${v.text}`
        e.dataTransfer.setData("text/plain", verseText)
        e.dataTransfer.effectAllowed = "copy"
      }}
      className={cn(
        "group flex gap-3 rounded-md px-3 py-2 transition-all duration-300 hover:bg-accent/40 cursor-grab active:cursor-grabbing",
        hasNote && "bg-accent/30",
        highlightColor && HIGHLIGHT_CLASSES[highlightColor as HighlightColor],
        isSelected && "ring-2 ring-primary bg-primary/5 dark:bg-primary/10",
        isFlashed && "bg-yellow-500/15 dark:bg-yellow-500/10 ring-2 ring-yellow-500/80 scale-[1.01] shadow-sm",
      )}
    >
      <span
        className="mt-1.5 select-none font-medium text-primary tabular-nums cursor-pointer hover:underline"
        onClick={(e) => {
          e.stopPropagation()
          onToggleSelect(verseNum, e.shiftKey)
        }}
        style={{ fontSize: `${Math.max(12, fontSize - 6)}px` }}
      >
        {v.verse}
      </span>
      <p
        onClick={(e) => {
          e.stopPropagation()
          onToggleSelect(verseNum, e.shiftKey)
          onSetCurrent(verseNum)
        }}
        className="flex-1 font-serif leading-relaxed text-foreground cursor-pointer select-none"
        style={{ fontSize: `${fontSize}px` }}
      >
        {v.text}
      </p>
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
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20 dark:text-emerald-400 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 transition-colors"
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
            "inline-flex size-7 shrink-0 items-center justify-center rounded-md transition-colors",
            isGuest
              ? "text-muted-foreground/60 hover:text-primary hover:bg-primary/10"
              : hasNote
                ? "text-primary hover:bg-primary/10"
                : "text-muted-foreground/80 hover:text-foreground hover:bg-accent",
          )}
        >
          {isGuest ? <FileText className="size-4" /> : hasNote ? <FileText className="size-4" /> : <Plus className="size-4" />}
        </button>
      </div>
    </li>
  )
})
