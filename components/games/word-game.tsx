"use client"

import { useRef } from "react"
import { Lightbulb } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { gradeGuess, keyboardGrades, LETTER_LABELS } from "@/lib/games/engine"
import { useWordGame, type OnGameComplete } from "@/lib/games/hooks"
import { GameResultPanel, PassageButton, letterClasses, letterSymbols, type OpenPassage } from "./game-ui"

export function WordGame({ onComplete, onOpen, onRestart }: { onComplete: OnGameComplete; onOpen: OpenPassage; onRestart: () => void }) {
  const game = useWordGame(onComplete)
  const input = useRef<HTMLInputElement>(null)
  const grades = keyboardGrades(game.guesses, game.target)
  const canReveal = [...game.target].some((letter, index) => !game.hints.includes(index) && !game.guesses.some((guess) => guess[index] === letter))
  return <div className="space-y-5">
    <div className="space-y-2 rounded-xl border border-border bg-card p-5 text-center">
      <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground"><Lightbulb className="size-4" aria-hidden />{game.puzzle.category} · {game.target.length} letras</p>
      <h2 className="text-lg font-semibold leading-relaxed">{game.puzzle.clue}</h2>
    </div>
    <div className="mx-auto grid max-w-md gap-1.5" aria-label="Intentos de la palabra" role="list">
      {Array.from({ length: 6 }, (_, row) => {
        const guess = game.guesses[row]
        const letters = guess ?? (row === game.guesses.length ? game.draft : "")
        const marks = guess ? gradeGuess(guess, game.target) : null
        return <div key={row} role="listitem" aria-label={`Intento ${row + 1}${guess ? `: ${[...guess].map((letter, index) => `${letter}, ${LETTER_LABELS[marks![index]]}`).join("; ")}` : " pendiente"}`} className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${game.target.length}, minmax(0, 1fr))` }}>
          {Array.from({ length: game.target.length }, (_, column) => <span key={column} aria-hidden className={cn("relative flex aspect-square max-h-16 items-center justify-center rounded-md border-2 font-mono text-xl font-bold sm:text-2xl", marks ? letterClasses[marks[column]] : letters[column] ? "border-primary bg-card" : "border-border bg-card/50")}>
            {letters[column]}{marks && <span className="absolute bottom-0 right-1 text-[10px]">{letterSymbols[marks[column]]}</span>}
          </span>)}
        </div>
      })}
    </div>
    <p className="text-center text-xs leading-relaxed text-muted-foreground">● Verde: posición correcta · ↔ Ocre: otra posición · × Gris: no aparece</p>
    <p className="sr-only" role="status">{game.guesses.length > 0 ? `Intento ${game.guesses.length}: ${[...game.guesses.at(-1)!].map((letter, index) => `${letter}, ${LETTER_LABELS[gradeGuess(game.guesses.at(-1)!, game.target)[index]]}`).join("; ")}` : "Tienes seis intentos."}</p>
    {game.finished ? <GameResultPanel title={game.won ? "¡Encontraste la palabra!" : `La palabra era ${game.puzzle.word}`} score={game.score} onRestart={onRestart}>
      <p>{game.won ? `${game.puzzle.word} · ${game.guesses.length} de 6 intentos.` : "Lee el pasaje y vuelve a intentarlo con otra palabra."}</p>
      <PassageButton passage={game.puzzle} onOpen={onOpen} />
    </GameResultPanel> : <>
      <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); game.submit(); input.current?.focus() }}>
        <label htmlFor="wordle-answer" className="block text-sm font-semibold">Tu palabra · intento {game.guesses.length + 1} de 6</label>
        <div className="flex gap-2"><Input ref={input} id="wordle-answer" value={game.draft} onChange={(event) => game.edit(event.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck={false} aria-describedby="wordle-help wordle-error" className="min-h-12 min-w-0 font-mono text-base tracking-widest" /><Button type="submit" className="min-h-12 px-4">Probar</Button></div>
        <p id="wordle-help" className="text-xs text-muted-foreground">Sin tildes. La Ñ sí cuenta como letra distinta.</p>
        <p id="wordle-error" role="alert" className="min-h-5 text-sm font-semibold">{game.error}</p>
      </form>
      <div className="flex flex-wrap justify-center gap-1.5" aria-label="Teclado de letras">{[..."QWERTYUIOPASDFGHJKLÑZXCVBNM"].map((letter) => <button key={letter} type="button" aria-label={`${letter}${grades[letter] ? `, ${LETTER_LABELS[grades[letter]]}` : ""}`} onClick={() => game.edit(game.draft + letter)} className={cn("relative min-h-11 min-w-11 cursor-pointer rounded-md border px-3 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring", grades[letter] ? letterClasses[grades[letter]] : "border-border bg-card hover:bg-accent")}>
        {letter}{grades[letter] && <span className="absolute bottom-0 right-1 text-[9px]" aria-hidden>{letterSymbols[grades[letter]]}</span>}
      </button>)}<Button variant="outline" className="min-h-11" onClick={() => game.edit(game.draft.slice(0, -1))}>Borrar</Button></div>
      <div className="space-y-2 border-t border-border pt-4">
        <Button variant="outline" className="min-h-11" disabled={!canReveal} onClick={game.reveal}><Lightbulb aria-hidden />Revelar una letra · −15 puntos</Button>
        {game.hints.length > 0 && <p role="status" className="text-sm">{game.hints.map((position) => `Letra ${position + 1}: ${game.target[position]}`).join(" · ")}</p>}
      </div>
    </>}
  </div>
}
