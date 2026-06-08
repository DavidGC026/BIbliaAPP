"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { 
  BookOpen, 
  BookText, 
  Calendar, 
  Heart, 
  PlusCircle, 
  Search, 
  Sparkles, 
  ArrowRight,
  TrendingUp,
  FileText
} from "lucide-react"

interface DashboardProps {
  userName: string
  setActiveTab: (tab: string) => void
}

const INSPIRED_VERSES = [
  { text: "Porque de tal manera amó Dios al mundo, que ha dado a su Hijo unigénito, para que todo aquel que en él cree, no se pierda, mas tenga vida eterna.", ref: "Juan 3:16", bg: "from-amber-500/10 to-orange-500/10 border-amber-500/20" },
  { text: "Jehová es mi pastor; nada me faltará. En lugares de delicados pastos me hará descansar; Junto a aguas de reposo me pastoreará.", ref: "Salmo 23:1-2", bg: "from-emerald-500/10 to-teal-500/10 border-emerald-500/20" },
  { text: "Y sabemos que a los que aman a Dios, todas las cosas les ayudan a bien, esto es, a los que conforme a su propósito son llamados.", ref: "Romanos 8:28", bg: "from-blue-500/10 to-indigo-500/10 border-blue-500/20" },
  { text: "Pero los que esperan a Jehová tendrán nuevas fuerzas; levantarán alas como las águilas; correrán, y no se cansarán; caminarán, y no se fatigarán.", ref: "Isaías 40:31", bg: "from-purple-500/10 to-pink-500/10 border-purple-500/20" },
  { text: "No temas, porque yo estoy contigo; no desmayes, porque yo soy tu Dios que te esfuerzo; siempre te ayudaré, siempre te sustentaré con la diestra de mi justicia.", ref: "Isaías 41:10", bg: "from-cyan-500/10 to-blue-500/10 border-cyan-500/20" },
  { text: "Mi paz os dejo, mi paz os doy; yo no os la doy como el mundo la da. No se turbe vuestro corazón, ni tenga miedo.", ref: "Juan 14:27", bg: "from-rose-500/10 to-pink-500/10 border-rose-500/20" },
  { text: "Mira que te mando que te esfuerces y seas valiente; no temas ni desmayes, porque Jehová tu Dios estará contigo en dondequiera que vayas.", ref: "Josué 1:9", bg: "from-orange-500/10 to-red-500/10 border-orange-500/20" },
  { text: "Todo lo puedo en Cristo que me fortalece.", ref: "Filipenses 4:13", bg: "from-violet-500/10 to-purple-500/10 border-violet-500/20" }
]

export function Dashboard({ userName, setActiveTab }: DashboardProps) {
  const [dailyVerse, setDailyVerse] = useState(INSPIRED_VERSES[0])

  useEffect(() => {
    // Select daily verse based on day of month
    const day = new Date().getDate()
    const index = day % INSPIRED_VERSES.length
    setDailyVerse(INSPIRED_VERSES[index])
  }, [])

  // Fetch devotionals
  const { data: devData } = useSWR("/api/devotionals", fetcher)
  const devotionals = devData?.devotionals ?? []

  // Fetch notebooks
  const { data: notebooksData } = useSWR("/api/notebooks", fetcher)
  const notebooks = notebooksData?.notebooks ?? []

  return (
    <div className="space-y-8 p-1 md:p-4 animate-fade-in">
      
      {/* Saludo */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl flex items-center gap-2">
          ¡Hola, {userName}! <Sparkles className="size-6 text-primary animate-pulse" />
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Te damos la bienvenida a tu panel de estudio bíblico personal.
        </p>
      </div>

      {/* Versículo del Día */}
      <div className={`rounded-2xl border bg-gradient-to-r p-6 md:p-8 shadow-sm transition-all hover:shadow-md ${dailyVerse.bg}`}>
        <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-3">
          <Calendar className="size-4" />
          <span>Versículo del Día</span>
        </div>
        <p className="text-lg md:text-xl font-medium font-serif leading-relaxed text-foreground/90">
          “{dailyVerse.text}”
        </p>
        <p className="mt-3 text-sm font-semibold text-primary">
          — {dailyVerse.ref}
        </p>
      </div>

      {/* Grid Estadísticas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex items-center gap-4 transition-all hover:scale-[1.01]">
          <span className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BookText className="size-6" />
          </span>
          <div>
            <p className="text-2xl font-bold text-foreground">{notebooks.length}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Libretas Creadas</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex items-center gap-4 transition-all hover:scale-[1.01]">
          <span className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Heart className="size-6" />
          </span>
          <div>
            <p className="text-2xl font-bold text-foreground">{devotionals.length}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Devocionales Escritos</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex items-center gap-4 sm:col-span-2 lg:col-span-1 transition-all hover:scale-[1.01]">
          <span className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <TrendingUp className="size-6" />
          </span>
          <div>
            <p className="text-2xl font-bold text-foreground">
              {devotionals.length > 0 ? "Constante" : "Iniciando"}
            </p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Progreso Espiritual</p>
          </div>
        </div>
      </div>

      {/* Grid Dos Columnas: Enlaces Rápidos y Devocionales Recientes */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        
        {/* Acciones Rápidas */}
        <div className="lg:col-span-5 space-y-4">
          <h2 className="text-lg font-bold text-foreground">Acciones Rápidas</h2>
          
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => setActiveTab("reading")}
              className="flex items-center justify-between w-full p-4 rounded-xl border border-border bg-card/40 hover:bg-accent/40 text-left transition-all group active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <BookOpen className="size-5" />
                </span>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">Ir a Lectura</h3>
                  <p className="text-xs text-muted-foreground">Lee la Biblia y comenta pasajes</p>
                </div>
              </div>
              <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </button>

            <button 
              onClick={() => setActiveTab("devotionals")}
              className="flex items-center justify-between w-full p-4 rounded-xl border border-border bg-card/40 hover:bg-accent/40 text-left transition-all group active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <PlusCircle className="size-5" />
                </span>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">Nuevo Devocional</h3>
                  <p className="text-xs text-muted-foreground">Escribe en tu diario espiritual hoy</p>
                </div>
              </div>
              <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </button>

            <button 
              onClick={() => setActiveTab("search")}
              className="flex items-center justify-between w-full p-4 rounded-xl border border-border bg-card/40 hover:bg-accent/40 text-left transition-all group active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Search className="size-5" />
                </span>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">Buscador Avanzado</h3>
                  <p className="text-xs text-muted-foreground">Busca versículos y palabras clave</p>
                </div>
              </div>
              <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>

        {/* Últimos Devocionales */}
        <div className="lg:col-span-7 space-y-4">
          <h2 className="text-lg font-bold text-foreground">Devocionales Recientes</h2>
          
          {devotionals.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
              <FileText className="mx-auto mb-2 size-8 opacity-40" />
              <p className="text-sm">Aún no has escrito ningún devocional en tu diario espiritual.</p>
              <button 
                onClick={() => setActiveTab("devotionals")}
                className="mt-3 text-xs font-semibold text-primary hover:underline"
              >
                Comienza a escribir uno ahora
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {devotionals.slice(0, 3).map((dev: any) => (
                <div 
                  key={dev.id}
                  className="p-4 rounded-xl border border-border bg-card/30 flex items-start justify-between gap-4"
                >
                  <div className="min-w-0">
                    <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary mb-1.5">
                      {dev.emotion || "Sin emoción"}
                    </span>
                    <h3 className="font-bold text-sm text-foreground truncate">{dev.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 italic">Pasaje: {dev.verseRef || "N/A"}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 mt-1">
                    {new Date(dev.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
              {devotionals.length > 3 && (
                <button 
                  onClick={() => setActiveTab("devotionals")}
                  className="w-full text-center py-2 text-xs font-bold text-primary hover:underline"
                >
                  Ver todos los devocionales ({devotionals.length})
                </button>
              )}
            </div>
          )}
        </div>

      </div>

    </div>
  )
}
