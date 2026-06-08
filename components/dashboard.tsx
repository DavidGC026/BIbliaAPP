"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { VerseOfTheDay } from "@/components/verse-of-the-day"
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

export function Dashboard({ userName, setActiveTab }: DashboardProps) {
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

      {/* Nuevo Versículo del Día Temático */}
      <VerseOfTheDay />

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
