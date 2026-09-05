"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ArrowRight, Trophy } from "lucide-react"
import { AppIcon } from "@/components/ui/app-icon"
import { GAME_CATALOG, type GameId } from "@/lib/games/content"
import { emptyProgress, parseProgress, recordResult, type GameResult } from "@/lib/games/progress"
import { CompleteVerse } from "./complete-verse"
import { MemoryGame } from "./memory-game"
import { WordGame } from "./word-game"
import { GameHeader, type OpenPassage } from "./game-ui"

export function BibleGames({ userId, onOpenPassage }: { userId?: number; onOpenPassage: OpenPassage }) {
  const [active, setActive] = useState<GameId | null>(null)
  const [round, setRound] = useState(0)
  const [progress, setProgress] = useState(emptyProgress)
  const progressRef = useRef(progress)
  const [ready, setReady] = useState(false)
  const [storageError, setStorageError] = useState(false)
  const storageKey = `biblia-games-v1-${userId ?? "guest"}`
  useEffect(() => {
    try { progressRef.current = parseProgress(localStorage.getItem(storageKey)) }
    catch { progressRef.current = emptyProgress(); setStorageError(true) }
    setProgress(progressRef.current)
    setReady(true)
  }, [storageKey])
  const onComplete = useCallback((result: GameResult) => {
    const next = recordResult(progressRef.current, result)
    progressRef.current = next
    setProgress(next)
    try { localStorage.setItem(storageKey, JSON.stringify(next)) } catch { setStorageError(true) }
  }, [storageKey])

  const restart = () => setRound((value) => value + 1)
  const game = GAME_CATALOG.find((entry) => entry.id === active)
  const totalPlayed = Object.values(progress.games).reduce((sum, stats) => sum + stats.played, 0)
  const totalPoints = Object.values(progress.games).reduce((sum, stats) => sum + stats.points, 0)

  return <div className="mx-auto max-w-4xl space-y-7 pb-8 text-foreground">
    {game ? <div className="mx-auto max-w-2xl space-y-6">
      <GameHeader title={game.title} description={game.description} onBack={() => setActive(null)} onRestart={restart} />
      <div key={`${active}-${round}`}>
        {active === "complete" && <CompleteVerse onComplete={onComplete} onOpen={onOpenPassage} onRestart={restart} />}
        {active === "memory" && <MemoryGame onComplete={onComplete} onOpen={onOpenPassage} onRestart={restart} />}
        {active === "wordle" && <WordGame onComplete={onComplete} onOpen={onOpenPassage} onRestart={restart} />}
      </div>
    </div> : <>
      <header className="space-y-3 pt-2"><p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground"><AppIcon name="trophy" className="size-5" />Aprender jugando</p><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Juegos bíblicos</h1><p className="max-w-xl text-base leading-relaxed text-muted-foreground">Recuerda un versículo, conecta una historia o descubre una palabra. Elige tu próximo reto.</p></header>
      <div className="grid gap-4">{GAME_CATALOG.map((entry) => <button key={entry.id} type="button" disabled={!ready} onClick={() => { setActive(entry.id); restart() }} className="group flex cursor-pointer items-start gap-4 rounded-2xl border border-border bg-card p-5 text-left transition-colors hover:border-primary/50 hover:bg-accent/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50 motion-reduce:transition-none sm:gap-5 sm:p-6">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><AppIcon name={entry.icon} className="size-6" /></span>
        <span className="min-w-0 flex-1"><span className="block text-lg font-bold sm:text-xl">{entry.title}</span><span className="mt-1 block text-sm leading-relaxed text-muted-foreground">{entry.description}</span><span className="mt-3 block text-xs font-semibold text-muted-foreground">{entry.detail}</span></span>
        <ArrowRight className="mt-3 size-5 shrink-0 text-muted-foreground" aria-hidden />
      </button>)}</div>
      <section className="space-y-4 border-t border-border pt-6" aria-label="Tus resultados">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-lg font-bold"><Trophy className="size-5 text-primary" aria-hidden />Tus resultados</h2><p className="text-sm text-muted-foreground">{totalPlayed} partidas · {totalPoints} puntos</p></div>
        <dl className="grid gap-4 sm:grid-cols-3">{GAME_CATALOG.map((entry) => <div key={entry.id} className="space-y-1"><dt className="text-sm text-muted-foreground">{entry.title}</dt><dd className="text-lg font-semibold tabular-nums">{progress.games[entry.id].played ? `${progress.games[entry.id].best}/100` : "Por jugar"}<span className="mt-1 block text-xs font-normal text-muted-foreground">{progress.games[entry.id].played ? `Mejor puntuación · ${progress.games[entry.id].played} partidas` : "Tu primer reto te espera"}</span></dd></div>)}</dl>
        <p className="text-xs text-muted-foreground">Resultados guardados en este navegador{userId ? " para tu cuenta" : " como visitante"}. No se sincronizan entre dispositivos.</p>
      </section>
    </>}
    {storageError && <p role="status" className="text-sm">Puedes seguir jugando, pero el navegador no permite guardar tus resultados.</p>}
  </div>
}
