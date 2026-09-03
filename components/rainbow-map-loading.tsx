"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

/**
 * Pantalla de carga del mapa de referencias.
 *
 * El mapa tarda porque baja ~2 MB de arcos y luego dibuja casi 200.000 trazos,
 * así que la espera se cuenta: barra de progreso real (bytes descargados) y
 * mensajes que van rotando.
 *
 * La ilustración de fondo pesa 2 MB, más que los propios datos que tapa, así
 * que antes no llegaba a verse nunca: la pantalla se quedaba en negro y luego
 * aparecía el mapa. Por eso aquí va incrustada una miniatura de 138 bytes que
 * se pinta **al instante y sin red**, difuminada, y la ilustración grande se
 * funde encima cuando termine de bajar (o nunca, y no se nota).
 *
 * Para regenerar la miniatura si cambia el arte:
 *   node -e "require('sharp')('assets/images/references-map-loading.png') \
 *     .resize(40).webp({quality:45}).toBuffer() \
 *     .then(b => console.log(b.toString('base64')))"
 */

const LQIP =
  "data:image/webp;base64,UklGRoIAAABXRUJQVlA4IHYAAAAQBQCdASooABsAPt1WqE0opCQiMBqqqRAbiWcAwvgdG6ax0aaCZ7ob4ykUQGwI7QAAAP7wyxOgbhGdVp1mUKIuGzucgSy0EqK7dQjkLBjF9yoQb0Vs4GBg8yk8KJ6PLcc23jcyBveHw9GBEJAy6e+oHKcu6wAA"

const FULL_ART = "/api/assets/images/references-map-loading"

/** Van en orden, para que la espera parezca avanzar. */
const MESSAGES = [
  "Mapeando toda la información…",
  "Tendiendo puentes entre capítulos…",
  "Poniendo a Génesis a hablar con Apocalipsis…",
  "Contando cientos de miles de conexiones…",
  "Buscando qué versículo cita a cuál…",
  "Personalizando tu experiencia…",
  "Sacando brillo al arcoíris…",
  "Ordenando los arcos, los largos al fondo…",
  "Casi está: puliendo los últimos trazos…",
]

const MESSAGE_MS = 2400

interface RainbowMapLoadingProps {
  /** 0–1 con el avance real, o `null` si todavía no se puede saber. */
  ratio: number | null
  /** Texto fijo bajo la barra: en qué fase va. */
  phase: string
}

export function RainbowMapLoading({ ratio, phase }: RainbowMapLoadingProps) {
  const [messageIndex, setMessageIndex] = useState(0)
  const [artLoaded, setArtLoaded] = useState(false)

  useEffect(() => {
    // Se detiene en el último para no repetir el ciclo en esperas largas.
    if (messageIndex >= MESSAGES.length - 1) return
    const timer = setTimeout(() => setMessageIndex((i) => i + 1), MESSAGE_MS)
    return () => clearTimeout(timer)
  }, [messageIndex])

  const percent = ratio === null ? null : Math.round(ratio * 100)

  return (
    <div className="relative flex h-full min-h-[320px] items-center justify-center overflow-hidden rounded-2xl bg-[#07121f]">
      {/* Miniatura incrustada: se ve desde el primer fotograma, sin red */}
      <img
        src={LQIP}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full scale-110 object-cover opacity-80 blur-xl"
      />
      {/* La ilustración de verdad, que se funde encima cuando llegue */}
      <img
        src={FULL_ART}
        alt=""
        aria-hidden
        onLoad={() => setArtLoaded(true)}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
          artLoaded ? "opacity-80" : "opacity-0"
        }`}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#07121f]/25 via-[#07121f]/20 to-[#07121f]/75" />

      <div className="relative flex w-full max-w-sm flex-col items-center gap-4 px-6 text-center text-white">
        <span className="flex size-14 items-center justify-center rounded-2xl border border-white/20 bg-slate-950/45 shadow-xl backdrop-blur-sm">
          <Loader2 className="size-6 animate-spin text-amber-200" />
        </span>

        <div className="min-h-[3.25rem]">
          <p
            key={messageIndex}
            aria-live="polite"
            className="animate-in fade-in duration-500 text-base font-semibold tracking-tight"
          >
            {MESSAGES[messageIndex]}
          </p>
          <p className="mt-1 text-xs text-slate-200/80">Conectando capítulos y referencias cruzadas</p>
        </div>

        <div className="w-full">
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent ?? undefined}
            aria-label="Progreso de carga del mapa"
            className="h-1.5 w-full overflow-hidden rounded-full bg-white/15"
          >
            <div
              className={
                percent === null
                  ? // Antes del primer aviso de bytes no hay nada que medir:
                    // late, en vez de fingir un porcentaje.
                    "h-full w-1/6 animate-pulse rounded-full bg-amber-200/80"
                  : "h-full rounded-full bg-amber-200 transition-[width] duration-300 ease-out"
              }
              style={percent === null ? undefined : { width: `${percent}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-200/70">
            <span>{phase}</span>
            {percent === null ? null : <span className="tabular-nums">{percent}%</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
