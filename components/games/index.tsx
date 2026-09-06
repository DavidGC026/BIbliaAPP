"use client"

import { useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { ArrowRight, Trophy } from "lucide-react"
import { AppIcon } from "@/components/ui/app-icon"
import { Button } from "@/components/ui/button"
import { GAME_CATALOG } from "@/lib/games/content"
import { useGamesSession, type GameStorage } from "@/lib/games/session"
import { loadGameContent, synchronizeGameProgress } from "@/lib/game-api-client"
import { CompleteVerse } from "./complete-verse"
import { MemoryGame } from "./memory-game"
import { WordGame } from "./word-game"
import { GameHeader, type OpenPassage } from "./game-ui"
import { FreeOptions, SavedRounds, ProgressSync, WeeklyProgress } from "./training-panels"
import { LEVEL_LABELS } from "@/lib/games/training"

const ContentEditor = dynamic(() => import("./content-editor").then(module => module.ContentEditor))
const storage: GameStorage = {
  async get(key) { return localStorage.getItem(key) },
  async set(key, value) { localStorage.setItem(key, value) },
}

export function BibleGames({ userId, isAdmin = false, onOpenPassage }: { userId?: number; isAdmin?: boolean; onOpenPassage: OpenPassage }) {
  const session = useGamesSession({ storage, storageKey: `biblia-games-v2-${userId ?? "guest"}`, legacyKey: `biblia-games-v1-${userId ?? "guest"}`, loadContent: loadGameContent, userId, synchronize: synchronizeGameProgress })
  const [view, setView] = useState<"free" | "daily" | "review" | "week" | "editor">("free")
  useEffect(() => {
    const refresh = () => { void session.sync(); void session.refresh() }
    window.addEventListener("focus", refresh); window.addEventListener("online", refresh)
    return () => { window.removeEventListener("focus", refresh); window.removeEventListener("online", refresh) }
  }, [session.sync, session.refresh])
  const { progress, active } = session
  const container = useRef<HTMLDivElement>(null)
  useEffect(() => { container.current?.scrollIntoView({ block: "start" }) }, [active?.mountKey, view])
  const game = GAME_CATALOG.find(entry => entry.id === active?.game)
  const totalPlayed = Object.values(progress.games).reduce((sum, stats) => sum + stats.played, 0)
  const totalPoints = Object.values(progress.games).reduce((sum, stats) => sum + stats.points, 0)
  const due = session.reviews.filter(item => item.due <= session.today).length
  const roundProps = { onComplete: session.onComplete, onOpen: onOpenPassage, onRestart: session.restart, settings: active?.settings, onAttempt: session.onAttempt, roundId: active?.id, checkpoint: active?.checkpoint, onCheckpoint: session.onCheckpoint }

  if (view === "editor" && isAdmin) return <div ref={container} className="mx-auto max-w-4xl scroll-mt-20 space-y-5 md:scroll-mt-6"><Button variant="outline" className="min-h-11" onClick={() => { setView("free"); void session.refresh() }}>Volver a juegos</Button><ContentEditor /></div>
  return <div ref={container} className="mx-auto max-w-4xl scroll-mt-20 space-y-7 pb-8 text-foreground md:scroll-mt-6">
    {game && active ? <div className="mx-auto max-w-2xl space-y-6">
      <GameHeader title={game.title} description={game.description} onBack={session.back} onRestart={session.restart} />
      {active.settings.mode !== "free" && <p className="rounded-lg bg-primary/10 px-4 py-3 text-sm font-semibold">{active.settings.mode === "daily" ? `Reto diario · ${active.settings.dailyDate}${progress.dailyScores[`${active.settings.dailyDate}:${game.id}`] ? " · Resultado guardado; repetir no suma puntos adicionales." : ""}` : "Repasar mis errores"}</p>}
      {active.settings.level && <p className="text-sm font-semibold text-muted-foreground">Nivel {LEVEL_LABELS[active.settings.level].toLowerCase()}</p>}
      <div key={active.mountKey}>
        {(active.game === "complete" || active.game === "order") && <CompleteVerse {...roundProps} order={active.game === "order"} />}
        {active.game === "memory" && <MemoryGame {...roundProps} />}
        {active.game === "wordle" && <WordGame {...roundProps} />}
      </div>
    </div> : <>
      <header className="space-y-3 pt-2"><p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground"><AppIcon name="trophy" className="size-5" />Aprender jugando</p><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Juegos bíblicos</h1><p className="max-w-xl text-base leading-relaxed text-muted-foreground">Practica a tu ritmo, descubre el reto de hoy o vuelve a un pasaje que quieras recordar.</p></header>
      <div role="group" aria-label="Cómo quieres jugar" className="flex flex-wrap gap-2">{([["free", "Jugar libre"], ["daily", "Reto diario"], ["review", `Repasar mis errores${due ? ` (${due})` : ""}`], ["week", "Mi semana"]] as const).map(([id, label]) => <Button key={id} variant={view === id ? "default" : "outline"} aria-pressed={view === id} className="min-h-12" onClick={() => setView(id)}>{label}</Button>)}</div>
      <ProgressSync session={session} signedIn={!!userId} />
      {view === "free" && <><SavedRounds session={session} /><FreeOptions session={session} /></>}
      {view === "daily" && <div className="space-y-2 border-l-4 border-primary bg-primary/5 p-5"><h2 className="text-xl font-semibold">El reto del {session.today}</h2><p className="text-sm text-muted-foreground">Una partida de cada juego. Los retos cambian a medianoche de Ciudad de México y son los mismos en web y móvil. Cada juego suma puntos una sola vez al día para tu cuenta; los visitantes guardan sus resultados aquí.</p>{!session.dailyAvailable && <p role="status">Actualiza el contenido con conexión para cargar el reto de hoy.</p>}</div>}
      {view === "week" ? <WeeklyProgress session={session} /> : view !== "review" ? <div className="grid gap-4">{GAME_CATALOG.map(entry => {
        const result = view === "daily" ? progress.dailyScores[`${session.today}:${entry.id}`] : undefined
        return <button key={entry.id} type="button" disabled={!session.ready || (view === "daily" && !session.dailyAvailable) || (view === "free" && entry.id === "wordle" && !session.availableWords)} onClick={() => session.start(entry.id, view === "daily" ? "daily" : "free")} className="group flex cursor-pointer items-start gap-4 rounded-2xl border border-border bg-card p-5 text-left transition-colors hover:border-primary/50 hover:bg-accent/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50 motion-reduce:transition-none sm:gap-5 sm:p-6">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><AppIcon name={entry.icon} className="size-6" /></span>
          <span className="min-w-0 flex-1"><span className="block text-lg font-bold sm:text-xl">{entry.title}</span><span className="mt-1 block text-sm leading-relaxed text-muted-foreground">{entry.description}</span><span className="mt-3 block text-xs font-semibold text-muted-foreground">{result ? `Completado · ${result.score}/100 · Repetir` : entry.id === "wordle" && view === "free" ? `${session.availableWords} palabras · sin repetir con estos filtros` : entry.detail}</span></span>
          <ArrowRight className="mt-3 size-5 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      })}</div> : <section className="space-y-4" aria-label="Repasos pendientes">
        <h2 className="text-xl font-semibold">{session.reviews.length ? `${due} para hoy · ${session.reviews.length} pendientes` : "Tu lista de repaso está vacía"}</h2>
        <p className="text-sm text-muted-foreground">Aquí aparecerán los Wordle que no resuelvas y los versículos que falles. Después de acertar, volverás a practicarlos en 1, 3 y 7 días.</p>
        {session.reviews.map(item => <div key={item.key} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-5"><div className="min-w-0 flex-1"><p className="font-semibold">{item.target.kind === "wordle" ? item.target.puzzle.clue : item.target.passage.reference}</p><p className="mt-2 text-sm text-muted-foreground">{GAME_CATALOG.find(game => game.id === item.target.kind)?.title} · {item.due <= session.today ? "Para hoy" : `Próximo repaso: ${item.due}`} · {item.successes}/4 repasos correctos</p></div><Button className="min-h-11" disabled={!session.ready} onClick={() => session.start(item.target.kind, "review", item.target)}>Practicar</Button></div>)}
      </section>}
      <div className="flex flex-wrap items-center gap-3"><Button variant="outline" className="min-h-11" disabled={session.refreshing} onClick={() => void session.refresh()}>{session.refreshing ? "Actualizando…" : "Actualizar contenido"}</Button>{isAdmin && <Button variant="outline" className="min-h-11" onClick={() => setView("editor")}>Administrar contenido</Button>}</div>
      {session.contentError && <p role="status" className="text-sm">{session.contentError}</p>}
      <section className="space-y-4 border-t border-border pt-6" aria-label="Tus resultados">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-lg font-bold"><Trophy className="size-5 text-primary" aria-hidden />Tus resultados</h2><p className="text-sm text-muted-foreground">{totalPlayed} partidas · {totalPoints} puntos</p></div>
        <dl className="grid gap-4 sm:grid-cols-2">{GAME_CATALOG.map(entry => <div key={entry.id} className="space-y-1"><dt className="text-sm text-muted-foreground">{entry.title}</dt><dd className="text-lg font-semibold tabular-nums">{progress.games[entry.id].played ? `${progress.games[entry.id].best}/100` : "Por jugar"}<span className="mt-1 block text-xs font-normal text-muted-foreground">{progress.games[entry.id].played ? `Mejor puntuación · ${progress.games[entry.id].played} partidas` : "Tu primer reto te espera"}</span></dd></div>)}</dl>
        <p className="text-xs text-muted-foreground">{userId ? "Resultados, palabras jugadas, repasos y partidas sincronizados con tu cuenta en web y móvil cuando hay conexión." : "Resultados, palabras jugadas, repasos y partidas guardados en este navegador como visitante."}</p>
      </section>
    </>}
    {session.storageError && <p role="status" className="text-sm">Puedes seguir jugando, pero no se pudieron guardar tus resultados. Las palabras podrían repetirse al volver.</p>}
  </div>
}
