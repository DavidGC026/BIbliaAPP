"use client"

import { useState } from "react"
import { Check, HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useMemoryGame, type OnGameComplete } from "@/lib/games/hooks"
import { GameResultPanel, PassageButton, type OpenPassage } from "./game-ui"

export function MemoryGame(props: { onComplete: OnGameComplete; onOpen: OpenPassage; onRestart: () => void }) {
  const [pairCount, setPairCount] = useState(6)
  const [started, setStarted] = useState(false)
  if (started) return <MemoryRound pairCount={pairCount} {...props} />
  return <div className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-8">
    <h2 className="text-lg font-semibold">Elige el tamaño del tablero</h2>
    <div className="grid grid-cols-3 gap-3">{[4, 6, 8].map((count) => <Button key={count} variant={pairCount === count ? "default" : "outline"} className="min-h-14" aria-pressed={pairCount === count} onClick={() => setPairCount(count)}>{count} pares</Button>)}</div>
    <p className="text-sm leading-relaxed text-muted-foreground">Encuentra la pareja de cada tarjeta. Si no coinciden, se cerrarán solas después de un momento. Menos intentos, más puntos.</p>
    <Button className="min-h-12 w-full" onClick={() => setStarted(true)}>Comenzar partida</Button>
  </div>
}

function MemoryRound({ pairCount, onComplete, onOpen, onRestart }: { pairCount: number; onComplete: OnGameComplete; onOpen: OpenPassage; onRestart: () => void }) {
  const game = useMemoryGame(pairCount, onComplete)
  if (game.finished) return <GameResultPanel title="¡Encontraste todas las parejas!" score={game.score} onRestart={onRestart}>
    <p>{game.pairs.length} pares en {game.attempts} intentos.</p>
    <div className="divide-y divide-border">{game.pairs.map((pair) => <div key={pair.id} className="py-3"><p className="font-semibold">{pair.left} · {pair.right}</p><PassageButton passage={pair} onOpen={onOpen} /></div>)}</div>
  </GameResultPanel>

  return <div className="space-y-4">
    <div className="flex flex-wrap justify-between gap-3 text-sm"><span role="status">{game.matched.length} de {game.pairs.length} pares</span><span className="text-muted-foreground">Intentos: {game.attempts}</span></div>
    <div className={cn("grid gap-2 sm:gap-3", pairCount === 6 ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-4")} aria-label="Tablero de memoria">
      {game.cards.map((card, index) => {
        const matched = game.matched.includes(card.pairId)
        const visible = matched || game.flipped.includes(card.id)
        return <button key={card.id} type="button" aria-label={visible ? `${card.text}${matched ? ", pareja encontrada" : ""}` : `Voltear tarjeta ${index + 1}`} aria-pressed={visible} disabled={matched || game.mismatch || visible} onClick={() => game.flip(card.id)} className={cn("relative flex min-h-32 cursor-pointer items-center justify-center rounded-xl border-2 p-3 text-center text-sm font-semibold leading-relaxed transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-default motion-reduce:transition-none sm:min-h-36 sm:text-base", matched ? "border-emerald-700 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100" : visible ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card enabled:hover:border-primary/60 enabled:hover:bg-accent")}>
          {visible ? card.text : <HelpCircle className="size-8 text-muted-foreground" aria-hidden />}
          {matched && <Check className="absolute right-2 top-2 size-4" aria-hidden />}
        </button>
      })}
    </div>
    <div className="min-h-16">{game.mismatch ? <p role="status" className="rounded-xl bg-muted p-3 text-center text-sm">Estas tarjetas no forman pareja. Se cerrarán automáticamente.</p> : <p className="text-center text-sm text-muted-foreground">{game.flipped.length === 1 ? "Elige otra tarjeta para buscar su pareja." : "Voltea dos tarjetas para relacionarlas."}</p>}</div>
  </div>
}
