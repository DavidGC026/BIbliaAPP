"use client"

import * as React from "react"
import { useState } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { Loader2, Palette, Highlighter, Edit2, Check, X, Search, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

const AVAILABLE_COLORS = [
  { id: "yellow", name: "Amarillo", bg: "bg-yellow-500", text: "text-yellow-700 dark:text-yellow-400", light: "bg-yellow-500/10" },
  { id: "green", name: "Verde", bg: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400", light: "bg-emerald-500/10" },
  { id: "blue", name: "Azul", bg: "bg-sky-500", text: "text-sky-700 dark:text-sky-400", light: "bg-sky-500/10" },
  { id: "orange", name: "Naranja", bg: "bg-orange-500", text: "text-orange-700 dark:text-orange-400", light: "bg-orange-500/10" },
  { id: "pink", name: "Rosa", bg: "bg-pink-500", text: "text-pink-700 dark:text-pink-400", light: "bg-pink-500/10" }
]

interface Highlight {
  id: number
  book_id: number
  chapter: number
  verse: number
  color: string
  created_at: string
  book_name: string
  text: string
}

export function HighlightsManager() {
  const { data: highlightsData, isLoading: isLoadingHighlights, mutate: mutateHighlights } = useSWR<{ highlights: Highlight[] }>("/api/highlights/all", fetcher)
  const { data: categoriesData, isLoading: isLoadingCategories, mutate: mutateCategories } = useSWR<{ categories: Record<string, string> }>("/api/highlights/categories", fetcher)

  const [activeColor, setActiveColor] = useState<string>("yellow")
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [newCategoryName, setNewCategoryName] = useState("")

  const highlights = highlightsData?.highlights || []
  const categories = categoriesData?.categories || {}

  const filteredHighlights = highlights.filter(h => h.color === activeColor)
  const currentCategoryName = categories[activeColor] || AVAILABLE_COLORS.find(c => c.id === activeColor)?.name || "Categoría"
  const activeColorTheme = AVAILABLE_COLORS.find(c => c.id === activeColor)

  async function handleSaveCategory() {
    if (!newCategoryName.trim()) return
    try {
      await fetch("/api/highlights/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ color: activeColor, name: newCategoryName })
      })
      setEditingCategory(null)
      mutateCategories()
    } catch (e) {
      console.error(e)
    }
  }

  async function handleRemoveHighlight(h: Highlight) {
    if (!confirm("¿Eliminar este subrayado?")) return
    try {
      await fetch("/api/highlights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId: h.book_id, chapter: h.chapter, verses: [h.verse], color: null })
      })
      mutateHighlights()
    } catch (e) {
      console.error(e)
    }
  }

  if (isLoadingHighlights || isLoadingCategories) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Highlighter className="size-6 text-primary" />
            Mis Subrayados
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Organiza tus versículos subrayados por color y ponles un nombre de categoría.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Colors */}
        <div className="lg:col-span-1 space-y-2">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 px-2">Colores</h3>
          {AVAILABLE_COLORS.map(color => {
            const isActive = activeColor === color.id
            const catName = categories[color.id] || color.name
            const count = highlights.filter(h => h.color === color.id).length

            return (
              <button
                key={color.id}
                onClick={() => {
                  setActiveColor(color.id)
                  setEditingCategory(null)
                }}
                className={cn(
                  "flex items-center justify-between w-full p-3 rounded-xl transition-all border",
                  isActive 
                    ? `border-${color.bg.split('-')[1]}-500/50 ${color.light} ring-1 ring-${color.bg.split('-')[1]}-500 shadow-sm` 
                    : "border-transparent hover:bg-accent/50 text-muted-foreground"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn("size-4 rounded-full shadow-inner", color.bg)} />
                  <span className={cn("text-sm font-semibold truncate max-w-[100px]", isActive ? color.text : "")}>
                    {catName}
                  </span>
                </div>
                <span className="text-xs font-medium bg-background/50 px-2 py-0.5 rounded-full border border-border/50">
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Highlight List */}
        <div className="lg:col-span-3">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm min-h-[500px]">
            {/* Category Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className={cn("size-6 rounded-full shadow-inner", activeColorTheme?.bg)} />
                {editingCategory === activeColor ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      autoFocus
                      value={newCategoryName}
                      onChange={e => setNewCategoryName(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleSaveCategory()}
                      className="text-xl font-bold bg-background border border-border rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-primary w-48"
                      placeholder="Nombre..."
                    />
                    <button onClick={handleSaveCategory} className="p-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-md">
                      <Check className="size-4" />
                    </button>
                    <button onClick={() => setEditingCategory(null)} className="p-1.5 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-md">
                      <X className="size-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 group">
                    <h2 className="text-2xl font-bold text-foreground">{currentCategoryName}</h2>
                    <button 
                      onClick={() => {
                        setNewCategoryName(currentCategoryName)
                        setEditingCategory(activeColor)
                      }}
                      className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                      title="Renombrar categoría"
                    >
                      <Edit2 className="size-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Verses */}
            {filteredHighlights.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-20 text-muted-foreground">
                <Palette className="size-12 opacity-20 mb-3" />
                <p>No tienes versículos subrayados con este color.</p>
                <p className="text-sm mt-1">Ve al Lector, selecciona un versículo y elige el color.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredHighlights.map(h => (
                  <div key={h.id} className="group relative bg-background border border-border/60 rounded-xl p-4 hover:border-border transition-colors shadow-sm hover:shadow">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={cn("px-2 py-0.5 rounded text-xs font-bold", activeColorTheme?.light, activeColorTheme?.text)}>
                            {h.book_name} {h.chapter}:{h.verse}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(h.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-foreground/90 leading-relaxed font-serif">
                          "{h.text}"
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveHighlight(h)}
                        className="opacity-0 group-hover:opacity-100 p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                        title="Quitar subrayado"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
