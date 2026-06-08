"use client"

import * as React from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { BarChart2, Loader2 } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"

interface BookStat {
  book_id: number
  book_name: string
  total_chapters: number
}

// Categorías para colores de la gráfica
function getCategoryColor(bookId: number) {
  if (bookId >= 1 && bookId <= 5) return "#10b981" // Pentateuco (Verde)
  if (bookId >= 6 && bookId <= 17) return "#3b82f6" // Históricos (Azul)
  if (bookId >= 18 && bookId <= 22) return "#eab308" // Poéticos (Amarillo)
  if (bookId >= 23 && bookId <= 39) return "#ef4444" // Profetas (Rojo)
  if (bookId >= 40 && bookId <= 43) return "#8b5cf6" // Evangelios (Morado)
  if (bookId === 44) return "#0ea5e9" // Hechos (Celeste)
  if (bookId >= 45 && bookId <= 65) return "#ec4899" // Epístolas (Rosa)
  if (bookId === 66) return "#f97316" // Apocalipsis (Naranja)
  return "#cbd5e1"
}

export function Statistics() {
  const { data, isLoading } = useSWR<{ statistics: BookStat[] }>("/api/statistics", fetcher)
  const stats = data?.statistics ?? []

  // Prellenar los 66 libros para que la gráfica tenga el eje X completo, 
  // aunque algunos tengan 0 capítulos leídos.
  const chartData = React.useMemo(() => {
    const allBooks = Array.from({ length: 66 }, (_, i) => ({
      book_id: i + 1,
      // Abbreviatura simplificada para el eje X
      name: `L${i+1}`, 
      chapters: 0,
      color: getCategoryColor(i + 1)
    }))

    stats.forEach(s => {
      const idx = s.book_id - 1
      if (allBooks[idx]) {
        allBooks[idx].chapters = Number(s.total_chapters)
      }
    })

    return allBooks
  }, [stats])

  return (
    <div className="space-y-6 animate-fade-in p-1 md:p-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            Mis Estadísticas <BarChart2 className="size-7 text-indigo-500" />
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Análisis de tu progreso de lectura bíblica
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-6">
          <section className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground mb-6">
              Capítulos por libro
            </h2>
            
            <div className="h-80 w-full mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 9 }} 
                    interval={2} 
                    axisLine={false} 
                    tickLine={false}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10 }} 
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Bar dataKey="chapters" radius={[2, 2, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex flex-wrap justify-center gap-4 text-xs font-semibold text-muted-foreground">
              <span className="flex items-center gap-1"><div className="size-3 rounded-sm bg-[#10b981]" /> Pentateuco</span>
              <span className="flex items-center gap-1"><div className="size-3 rounded-sm bg-[#3b82f6]" /> Históricos</span>
              <span className="flex items-center gap-1"><div className="size-3 rounded-sm bg-[#eab308]" /> Poéticos</span>
              <span className="flex items-center gap-1"><div className="size-3 rounded-sm bg-[#ef4444]" /> Profetas</span>
              <span className="flex items-center gap-1"><div className="size-3 rounded-sm bg-[#8b5cf6]" /> Evangelios</span>
              <span className="flex items-center gap-1"><div className="size-3 rounded-sm bg-[#0ea5e9]" /> Hechos</span>
              <span className="flex items-center gap-1"><div className="size-3 rounded-sm bg-[#ec4899]" /> Epístolas</span>
              <span className="flex items-center gap-1"><div className="size-3 rounded-sm bg-[#f97316]" /> Apocalipsis</span>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
