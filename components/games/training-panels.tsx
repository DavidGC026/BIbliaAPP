"use client"

import { Button } from "@/components/ui/button"
import { GAME_CATALOG } from "@/lib/games/content"
import { WORD_CATEGORIES } from "@/lib/games/catalog"
import { LEVEL_LABELS, type LevelChoice } from "@/lib/games/training"
import type { GamesSession } from "@/lib/games/session"

export function FreeOptions({ session }: { session: GamesSession }) {
  return <details aria-label="Opciones de partidas libres" className="rounded-2xl border border-border bg-card p-5 sm:p-6">
    <summary className="min-h-11 cursor-pointer rounded-lg font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">Personalizar práctica<span className="mt-2 block text-sm font-normal text-muted-foreground">Wordle: {session.availableWords} palabras · Dificultad {LEVEL_LABELS[session.levelChoice].toLowerCase()}</span></summary>
    <div className="mt-5 space-y-5">
    <fieldset className="space-y-3"><legend className="font-semibold">Palabras de Wordle</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2"><label htmlFor="word-length" className="block text-sm">Longitud</label><select id="word-length" className="min-h-12 w-full rounded-lg border border-input bg-background px-3" value={session.filters.length ?? "all"} onChange={event => session.changeFilters({ ...session.filters, length: Number(event.target.value) || null })}><option value="all">Todas las longitudes</option>{[4, 5, 6, 7].map(length => <option key={length} value={length}>{length} letras</option>)}</select></div>
        <div className="space-y-2"><label htmlFor="word-category" className="block text-sm">Categoría</label><select id="word-category" className="min-h-12 w-full rounded-lg border border-input bg-background px-3" value={session.filters.category ?? "all"} onChange={event => session.changeFilters({ ...session.filters, category: event.target.value === "all" ? null : event.target.value })}><option value="all">Todas las categorías</option>{WORD_CATEGORIES.map(category => <option key={category}>{category}</option>)}</select></div>
      </div>
      <p role="status" className="text-sm text-muted-foreground">{session.availableWords ? `${session.availableWords} palabras disponibles con estos filtros.` : "No hay palabras con estos filtros. Cambia la longitud o la categoría."}</p>
    </fieldset>
    <div className="space-y-2 border-t border-border pt-4"><label htmlFor="verse-level" className="block font-semibold">Dificultad de los versículos</label><select id="verse-level" className="min-h-12 w-full rounded-lg border border-input bg-background px-3" value={session.levelChoice} onChange={event => session.changeLevel(event.target.value as LevelChoice)}>{Object.entries(LEVEL_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><p className="text-sm text-muted-foreground">El nivel inicial usa pasajes cortos. El automático se ajusta según tus últimas partidas de completar y ordenar.</p></div>
    </div>
  </details>
}

export function SavedRounds({ session }: { session: GamesSession }) {
  if (!session.savedRounds.length) return null
  return <section aria-label="Partidas guardadas" className="space-y-3">
    <h2 className="text-xl font-bold">Continúa donde te quedaste</h2>
    {session.savedRounds.map(round => <div key={round.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4"><div className="min-w-0 flex-1"><p className="font-semibold">{GAME_CATALOG.find(game => game.id === round.game)?.title}</p><p className="mt-1 text-sm text-muted-foreground">{round.settings.mode === "daily" ? `Reto del ${round.settings.dailyDate}` : round.settings.mode === "review" ? "Repaso de errores" : "Partida libre"}{round.settings.level ? ` · ${LEVEL_LABELS[round.settings.level]}` : ""}</p></div><div className="flex flex-wrap gap-2"><Button className="min-h-11" onClick={() => session.resume(round)}>Continuar</Button><Button className="min-h-11" variant="ghost" aria-label={`Descartar ${GAME_CATALOG.find(game => game.id === round.game)?.title}`} onClick={() => session.discard(round.id)}>Descartar</Button></div></div>)}
  </section>
}

export function ProgressSync({ session, signedIn }: { session: GamesSession; signedIn: boolean }) {
  return <div className="space-y-2 text-sm">
    <div className="flex flex-wrap items-center gap-3"><p role="status" className="text-muted-foreground">{!signedIn ? "Como visitante, tu progreso se guarda en este navegador." : session.syncing ? "Sincronizando tu progreso…" : session.pending || session.syncError ? "Guardado aquí · pendiente de sincronizar" : session.lastSync ? "Progreso guardado en tu cuenta" : "Preparando la sincronización…"}</p>{signedIn && <Button variant="outline" className="min-h-11" disabled={session.syncing || !session.ready} onClick={() => void session.sync()}>Sincronizar ahora</Button>}</div>
    {!!session.syncError && <p role="status">{session.syncError}</p>}
  </div>
}

export function WeeklyProgress({ session }: { session: GamesSession }) {
  const week = session.week
  const dayLabel = (day: string) => new Intl.DateTimeFormat("es-MX", { weekday: "short", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`))
  return <section aria-label="Progreso semanal" className="space-y-6">
    <header className="space-y-2"><h2 className="text-2xl font-bold">Tu semana de práctica</h2><p className="text-sm text-muted-foreground">Del {week.days[0].day} al {session.today}, con las fechas de Ciudad de México.</p></header>
    <ol className="grid grid-cols-7 gap-1.5" aria-label="Actividad por día">{week.days.map(({ day, count }) => <li key={day} aria-label={`${day}: ${count} actividades completadas`} className={`space-y-2 rounded-xl border px-1 py-4 text-center ${count ? "border-primary/40 bg-primary/10" : "border-border bg-card"}`}><span className="block text-xs text-muted-foreground">{dayLabel(day)}</span><span className="block text-xl font-bold tabular-nums">{count}</span></li>)}</ol>
    <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">{[["Partidas", week.played], ["Puntos", week.points], ["Repasos completados", week.reviews], ["Respuestas correctas", `${week.correct}/${week.answers}`]].map(([label, value]) => <div key={label} className="space-y-2 rounded-xl border border-border bg-card p-4"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="text-2xl font-bold tabular-nums">{value}</dd></div>)}</dl>
    <div className="grid gap-6 sm:grid-cols-2"><section className="space-y-3"><h3 className="text-lg font-semibold">Lo que recordaste</h3>{week.learned.length ? <ul className="space-y-2">{week.learned.map(title => <li key={title} className="rounded-lg bg-primary/5 px-3 py-2">{title}</li>)}</ul> : <p className="text-sm text-muted-foreground">Resuelve una palabra o un versículo y aquí verás lo que practicaste.</p>}</section><section className="space-y-3"><h3 className="text-lg font-semibold">Temas para reforzar</h3>{week.topics.length ? <ul className="space-y-2">{week.topics.map(topic => <li key={topic.name} className="flex justify-between gap-3 border-b border-border pb-2"><span>{topic.name}</span><span className="text-sm text-muted-foreground">{topic.count} pendientes</span></li>)}</ul> : <p className="text-sm text-muted-foreground">No tienes temas pendientes de repaso.</p>}</section></div>
    <p className="text-xs text-muted-foreground">Las partidas antiguas conservan sus totales. Este resumen registra la actividad desde esta actualización; repetir un reto diario no vuelve a sumar puntos.</p>
  </section>
}
