"use client"

import * as React from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { Button } from "@/components/ui/button"
import { Star, Trash2, Loader2, BookOpen } from "lucide-react"

interface Favorite {
  id: number
  bible_id: number
  book_id: number
  book_name: string
  chapter: number
  verse: number
  verse_text: string
  created_at: string
}

export function Favorites() {
  const { data, mutate, isLoading } = useSWR<{ favorites: Favorite[] }>("/api/favorites", fetcher)
  const favorites = data?.favorites ?? []

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar este versículo de favoritos?")) return
    try {
      await fetch(`/api/favorites?id=${id}`, { method: "DELETE" })
      await mutate()
    } catch (err) {
      alert("Error al eliminar")
    }
  }

  return (
    <div className="space-y-6 animate-fade-in p-1 md:p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            Favoritos <Star className="size-7 text-amber-500 fill-amber-500/20" />
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tus versículos bíblicos guardados
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="py-12 flex justify-center"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-16 bg-card/50 rounded-2xl border border-dashed border-border">
            <Star className="size-12 mx-auto text-muted-foreground/30 mb-3" />
            <h3 className="font-bold text-lg">No tienes versículos favoritos</h3>
            <p className="text-muted-foreground text-sm">Mientras lees la Biblia, puedes marcar tus versículos preferidos.</p>
          </div>
        ) : (
          favorites.map(f => (
            <div key={f.id} className="p-5 rounded-xl border border-border bg-card shadow-sm group">
              <div className="flex justify-between items-start mb-2">
                <span className="flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-md">
                  <BookOpen className="size-3" />
                  {f.book_name} {f.chapter}:{f.verse}
                </span>
                <Button size="icon" variant="ghost" className="size-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(f.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <p className="text-foreground leading-relaxed font-serif text-lg">"{f.verse_text}"</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
