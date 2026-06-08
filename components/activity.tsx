"use client"

import * as React from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { Activity as ActivityIcon, CalendarDays, Loader2, BookOpen } from "lucide-react"

interface HeatmapDay {
  date: string
  total_chapters: number
}

interface ProgressBook {
  book_id: number
  book_name: string
  total_chapters: number
}

export function Activity() {
  const { data, isLoading } = useSWR<{ heatmap: HeatmapDay[], recentProgress: ProgressBook[] }>("/api/activity", fetcher)
  
  const heatmap = data?.heatmap ?? []
  const recentProgress = data?.recentProgress ?? []

  // Generate last 100 days for heatmap
  const days = React.useMemo(() => {
    const arr = []
    const today = new Date()
    for (let i = 99; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const found = heatmap.find(h => h.date.split('T')[0] === dateStr)
      arr.push({ date: dateStr, count: found ? Number(found.total_chapters) : 0 })
    }
    return arr
  }, [heatmap])

  const maxProgressChapters = 50 // arbitrary max for progress bar

  return (
    <div className="space-y-6 animate-fade-in p-1 md:p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            Actividad <ActivityIcon className="size-7 text-indigo-500" />
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Actividad Reciente y Progreso de Lectura
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-8">
          
          <section className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-6">
              <BookOpen className="size-4" />
              Progreso por libro
            </h2>
            {recentProgress.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aún no hay actividad reciente.</p>
            ) : (
              <div className="space-y-4">
                {recentProgress.map(p => {
                  const percentage = Math.min(100, (p.total_chapters / maxProgressChapters) * 100)
                  return (
                    <div key={p.book_id} className="space-y-1">
                      <div className="flex justify-between text-sm font-semibold">
                        <span>{p.book_name}</span>
                        <span className="text-muted-foreground">{p.total_chapters} cap. leídos</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-amber-600 rounded-full transition-all duration-1000 ease-out" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          <section className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-6">
              <CalendarDays className="size-4" />
              Calendario de Lectura
            </h2>
            <div className="flex flex-wrap gap-1.5 p-4 bg-muted/20 rounded-lg border border-border">
              {days.map(d => {
                let colorClass = "bg-muted" // 0 chapters
                if (d.count > 0 && d.count <= 2) colorClass = "bg-amber-200 dark:bg-amber-900/40"
                else if (d.count > 2 && d.count <= 5) colorClass = "bg-amber-400 dark:bg-amber-700/60"
                else if (d.count > 5) colorClass = "bg-amber-600 dark:bg-amber-500"

                return (
                  <div 
                    key={d.date} 
                    title={`${d.date}: ${d.count} capítulos`}
                    className={`size-3.5 sm:size-4 rounded-sm ${colorClass} transition-colors hover:ring-2 hover:ring-primary`}
                  />
                )
              })}
            </div>
            <div className="mt-4 flex items-center justify-end gap-2 text-xs text-muted-foreground font-medium">
              <span>Menos</span>
              <div className="flex gap-1">
                <div className="size-3 rounded-sm bg-muted" />
                <div className="size-3 rounded-sm bg-amber-200 dark:bg-amber-900/40" />
                <div className="size-3 rounded-sm bg-amber-400 dark:bg-amber-700/60" />
                <div className="size-3 rounded-sm bg-amber-600 dark:bg-amber-500" />
              </div>
              <span>Más</span>
            </div>
          </section>

        </div>
      )}
    </div>
  )
}
