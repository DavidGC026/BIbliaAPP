"use client"

import { useEffect, useRef, type ReactNode } from "react"
import { ArrowLeft, ArrowRight, BookOpen, RotateCcw, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { PassageReference } from "@/lib/games/content"

export type OpenPassage = (bookId: number, chapter: number, verse?: number, bibleId?: number) => void

export function GameHeader({ title, description, onBack, onRestart }: { title: string; description: string; onBack: () => void; onRestart: () => void }) {
  return <header className="space-y-4">
    <div className="flex items-center justify-between gap-2">
      <Button variant="ghost" onClick={onBack} className="min-h-11"><ArrowLeft aria-hidden />Juegos</Button>
      <Button variant="ghost" onClick={onRestart} className="min-h-11"><RotateCcw aria-hidden />Reiniciar</Button>
    </div>
    <div><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p></div>
  </header>
}

export function GameResultPanel({ score, title, children, onRestart }: { score: number; title: string; children?: ReactNode; onRestart: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus() }, [])
  return <section className="space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-8" aria-label="Resultado de la partida">
    <div role="status" className="flex items-center gap-4">
      <Trophy className="size-9 shrink-0 text-primary" aria-hidden />
      <div><h2 ref={heading} tabIndex={-1} className="text-xl font-bold focus:outline-none">{title}</h2><p className="mt-1 text-muted-foreground">{score} de 100 puntos</p></div>
    </div>
    {children}
    <Button onClick={onRestart} className="min-h-11 px-5">Jugar otra vez<ArrowRight aria-hidden /></Button>
  </section>
}

export function PassageButton({ passage, bibleId, onOpen }: { passage: PassageReference; bibleId?: number; onOpen: OpenPassage }) {
  return <Button variant="ghost" className="h-auto min-h-11 max-w-full whitespace-normal text-left" onClick={() => onOpen(passage.bookId, passage.chapter, passage.verse, bibleId)}>
    <BookOpen aria-hidden />Leer {passage.reference}
  </Button>
}

export const letterClasses = {
  correct: "border-emerald-700 bg-emerald-700 text-white",
  present: "border-yellow-700 bg-yellow-700 text-white",
  absent: "border-border bg-muted text-foreground",
}

export const letterSymbols = { correct: "●", present: "↔", absent: "×" }
