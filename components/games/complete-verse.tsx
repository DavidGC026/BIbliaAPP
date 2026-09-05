"use client"

import { useEffect, useRef, useState } from "react"
import useSWR from "swr"
import { CheckCircle2, CircleHelp, Loader2 } from "lucide-react"
import { fetcher } from "@/lib/fetcher"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { BibleVersion } from "@/lib/types"
import { normalizeAnswer, type GameVerse } from "@/lib/games/engine"
import { useVerseGame, type OnGameComplete } from "@/lib/games/hooks"
import { GameResultPanel, PassageButton, type OpenPassage } from "./game-ui"

export function CompleteVerse({ onComplete, onOpen, onRestart }: { onComplete: OnGameComplete; onOpen: OpenPassage; onRestart: () => void }) {
  const { data: catalog } = useSWR<{ bibles: BibleVersion[]; defaultBibleId: number }>("/api/bibles", fetcher)
  const [bibleId, setBibleId] = useState<number | null>(null)
  const [difficulty, setDifficulty] = useState<"options" | "write">("options")
  const [started, setStarted] = useState(false)
  const { data, error, isLoading, mutate } = useSWR<{ bible: BibleVersion; verses: GameVerse[] }>(
    bibleId === null ? "/api/games/verses" : `/api/games/verses?bible=${bibleId}`, fetcher,
    { revalidateOnFocus: false, shouldRetryOnError: false },
  )

  if (started && data) return <VerseRound verses={data.verses} bible={data.bible} difficulty={difficulty} onComplete={onComplete} onOpen={onOpen} onRestart={onRestart} />

  return <div className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-8">
    <div className="space-y-2">
      <label htmlFor="game-bible" className="block text-sm font-semibold">Versión bíblica</label>
      <select id="game-bible" className="min-h-12 w-full rounded-lg border border-input bg-background px-3 text-base focus-visible:outline-2 focus-visible:outline-ring" value={bibleId ?? data?.bible.bibleId ?? catalog?.defaultBibleId ?? ""} onChange={(event) => setBibleId(Number(event.target.value))}>
        {!catalog && <option value={data?.bible.bibleId ?? ""}>{data?.bible.name ?? "Cargando versiones…"}</option>}
        {catalog?.bibles.map((bible) => <option key={bible.bibleId} value={bible.bibleId}>{bible.name} ({bible.abbr})</option>)}
      </select>
    </div>
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold">Cómo quieres responder</legend>
      {([ ["options", "Con opciones", "Elige una de cuatro palabras."], ["write", "De memoria", "Escribe la palabra. Las tildes no cuentan."] ] as const).map(([value, title, detail]) => <label key={value} className={cn("flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border p-4", difficulty === value ? "border-primary bg-primary/5" : "border-border")}>
        <input type="radio" name="verse-difficulty" value={value} checked={difficulty === value} onChange={() => setDifficulty(value)} className="size-4 accent-[var(--primary)]" />
        <span><span className="block font-semibold">{title}</span><span className="block text-sm text-muted-foreground">{detail}</span></span>
      </label>)}
    </fieldset>
    {error ? <div role="alert" className="space-y-2"><p>No pudimos cargar los versículos. Revisa tu conexión e intenta de nuevo.</p><Button variant="outline" className="min-h-11" onClick={() => mutate()}>Reintentar</Button></div> : isLoading ? <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 motion-safe:animate-spin" aria-hidden />Preparando versículos…</p> : data && data.verses.length < 5 ? <p role="status">Esta versión no tiene suficientes pasajes para la partida. Elige otra versión.</p> : null}
    <Button className="min-h-12 w-full" disabled={isLoading || !!error || !data || data.verses.length < 5} onClick={() => setStarted(true)}>Comenzar · 5 versículos</Button>
  </div>
}

function VerseRound({ verses, bible, difficulty, onComplete, onOpen, onRestart }: {
  verses: GameVerse[]; bible: BibleVersion; difficulty: "options" | "write"; onComplete: OnGameComplete; onOpen: OpenPassage; onRestart: () => void;
}) {
  const game = useVerseGame(verses, onComplete)
  const [draft, setDraft] = useState("")
  const input = useRef<HTMLInputElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { if (difficulty === "write") input.current?.focus(); else heading.current?.focus() }, [game.index, difficulty])

  if (!game.questions.length) return <p role="alert">No se pudieron preparar preguntas con esta versión. <Button className="min-h-11" variant="outline" onClick={onRestart}>Elegir otra versión</Button></p>
  if (game.finished) return <GameResultPanel title={`${game.correctCount} de ${game.questions.length} respuestas correctas`} score={game.score} onRestart={onRestart}>
    <p className="text-sm text-muted-foreground">Repasa los pasajes de esta partida · {bible.abbr}</p>
    <div className="divide-y divide-border">{game.questions.map((question, index) => <div key={question.verse.id} className="space-y-2 py-4">
      <p className="font-semibold">{normalizeAnswer(game.answers[index]) === normalizeAnswer(question.answer) ? "Correcta" : `Tu respuesta: ${game.answers[index]}`}</p>
      <p className="font-serif text-lg leading-relaxed">{question.before}<strong>{question.answer}</strong>{question.after}</p>
      <PassageButton passage={{ ...question.verse, reference: `${question.verse.bookName} ${question.verse.chapter}:${question.verse.verse}` }} bibleId={bible.bibleId} onOpen={onOpen} />
    </div>)}</div>
  </GameResultPanel>

  const question = game.question
  const correct = game.answered && normalizeAnswer(game.answers[game.index]) === normalizeAnswer(question.answer)
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground"><span>Versículo {game.index + 1} de {game.questions.length}</span><span>{bible.abbr} · {game.correctCount} aciertos</span></div>
    <progress aria-label="Progreso de la partida" value={game.index} max={game.questions.length} className="block h-2 w-full accent-[var(--primary)]" />
    <section className="space-y-6 rounded-2xl border border-border bg-card p-5 sm:p-8">
      <h2 ref={heading} tabIndex={-1} className="text-sm font-semibold text-muted-foreground focus:outline-none">{question.verse.bookName} {question.verse.chapter}:{question.verse.verse}</h2>
      <p className="font-serif text-2xl leading-relaxed sm:text-3xl">
        {question.before}<span className="mx-1 inline-block min-w-20 border-b-2 border-primary bg-primary/10 px-2 text-center font-semibold" aria-label={game.answered ? question.answer : "palabra que falta"}>{game.answered ? question.answer : "_____"}</span>{question.after}
      </p>
      {difficulty === "options" ? <div className="grid gap-3 sm:grid-cols-2" aria-label="Opciones de respuesta">{question.options.map((option) => {
        const isAnswer = normalizeAnswer(option) === normalizeAnswer(question.answer)
        const selected = option === game.answers[game.index]
        return <button key={option} type="button" disabled={game.answered} onClick={() => game.answer(option)} className={cn("flex min-h-14 cursor-pointer items-center justify-between gap-2 rounded-xl border px-4 py-3 text-left text-base font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-default motion-reduce:transition-none", game.answered && isAnswer ? "border-emerald-700 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100" : selected ? "border-destructive bg-destructive/10" : "border-border bg-background enabled:hover:bg-accent")}>
          {option}{game.answered && isAnswer ? <CheckCircle2 className="size-5" aria-label="Respuesta correcta" /> : selected ? <CircleHelp className="size-5" aria-label="Tu respuesta" /> : null}
        </button>
      })}</div> : <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); game.answer(draft) }}>
        <label htmlFor="missing-word" className="block text-sm font-semibold">La palabra que falta</label>
        <Input ref={input} id="missing-word" autoComplete="off" autoCapitalize="none" spellCheck={false} value={draft} onChange={(event) => setDraft(event.target.value)} disabled={game.answered} className="min-h-12 text-base" />
        {!game.answered && <Button type="submit" disabled={!draft.trim()} className="min-h-11">Comprobar</Button>}
      </form>}
      {game.answered && <div className="space-y-4">
        <p role="status" className="font-semibold">{correct ? "¡Correcto!" : `La palabra es «${question.answer}». Sigue practicando.`}</p>
        <Button className="min-h-12 w-full" onClick={() => { setDraft(""); game.next() }}>{game.index === game.questions.length - 1 ? "Ver resultado" : "Siguiente versículo"}</Button>
      </div>}
    </section>
    {bible.attribution && <p className="text-xs text-muted-foreground">{bible.attribution}</p>}
  </div>
}
