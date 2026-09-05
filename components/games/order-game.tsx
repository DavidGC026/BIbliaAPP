"use client"

import { Button } from "@/components/ui/button"
import type { BibleVersion } from "@/lib/types"
import type { GameVerse } from "@/lib/games/engine"
import type { RoundContext } from "@/lib/games/round"
import { useOrderGame, type OnGameComplete } from "@/lib/games/hooks"
import { GameResultPanel, PassageButton, type OpenPassage } from "./game-ui"

export function OrderRound({ verses, bible, onComplete, onOpen, onRestart, settings, onAttempt }: RoundContext & { verses: GameVerse[]; bible: BibleVersion; onComplete: OnGameComplete; onOpen: OpenPassage; onRestart: () => void }) {
  const game = useOrderGame(verses, onComplete, { settings, onAttempt, bibleId: bible.bibleId })
  if (!game.questions.length) return <div role="alert" className="space-y-3"><p>No hay pasajes de 3 a 40 palabras disponibles para esta partida. Prueba otra versión.</p><Button onClick={onRestart}>Elegir otra versión</Button></div>
  if (game.finished) return <GameResultPanel title={`${game.correctCount} de ${game.questions.length} versículos ordenados`} score={game.score} onRestart={onRestart}>
    {game.questions.map(({ verse }, index) => <div key={verse.id} className="space-y-2 border-t border-border pt-4"><p className="font-semibold">{game.answers[index] ? "Correcto" : "Para repasar"}</p><p className="font-serif text-lg leading-relaxed">{verse.text}</p><PassageButton passage={{ ...verse, reference: `${verse.bookName} ${verse.chapter}:${verse.verse}` }} bibleId={bible.bibleId} onOpen={onOpen} /></div>)}
  </GameResultPanel>
  const question = game.question
  return <div className="space-y-5">
    <p className="text-sm text-muted-foreground">Versículo {game.index + 1} de {game.questions.length} · {bible.abbr}</p>
    <section className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-8">
      <h2 className="font-semibold">{question.verse.bookName} {question.verse.chapter}:{question.verse.verse}</h2>
      <p className="text-sm text-muted-foreground">Toca las palabras en el orden del versículo.</p>
      <div role="group" aria-label="Tu versículo" className="flex min-h-28 flex-wrap content-start gap-2 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-3">
        {!game.selected.length && <p className="py-3 text-sm text-muted-foreground">Tu versículo aparecerá aquí.</p>}
        {game.selected.map((token, position) => <Button key={token} variant="outline" disabled={game.answered} onClick={() => game.remove(token)} aria-label={`Quitar ${question.tokens[token]}, posición ${position + 1}`} className="min-h-11 h-auto whitespace-normal font-serif text-lg">{question.tokens[token]}</Button>)}
      </div>
      <p role="status" className="text-sm text-muted-foreground">{game.selected.length} de {question.tokens.length} palabras colocadas</p>
      <div role="group" aria-label="Palabras disponibles" className="flex flex-wrap gap-2">{question.shuffled.filter(token => !game.selected.includes(token)).map(token => <Button key={token} variant="outline" disabled={game.answered} onClick={() => game.choose(token)} aria-label={`Agregar ${question.tokens[token]}, ficha ${question.shuffled.indexOf(token) + 1}`} className="min-h-11 h-auto whitespace-normal font-serif text-lg">{question.tokens[token]}</Button>)}</div>
      {game.answered ? <div className="space-y-4"><p role="status" className="font-semibold">{game.answers[game.index] ? "¡Lo ordenaste correctamente!" : "Este es el orden del versículo. Puedes practicarlo en Repasar mis errores."}</p><p className="font-serif text-xl leading-relaxed">{question.verse.text}</p><Button className="min-h-12 w-full" onClick={game.next}>{game.index === game.questions.length - 1 ? "Ver resultado" : "Siguiente versículo"}</Button></div> : <div className="flex flex-wrap gap-2"><Button className="min-h-12" disabled={game.selected.length !== question.tokens.length} onClick={() => game.submit()}>Comprobar orden</Button><Button variant="outline" className="min-h-12" disabled={!game.selected.length} onClick={game.clear}>Empezar de nuevo</Button><Button variant="ghost" className="min-h-12" onClick={() => game.submit(true)}>Mostrar respuesta</Button></div>}
    </section>
    {bible.attribution && <p className="text-xs text-muted-foreground">{bible.attribution}</p>}
  </div>
}
