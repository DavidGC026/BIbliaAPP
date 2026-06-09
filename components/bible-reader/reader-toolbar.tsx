"use client"

import { memo } from "react"
import { Button } from "@/components/ui/button"
import { Copy, FileText, Image as ImageIcon, Share2, Star, X } from "lucide-react"
import type { HighlightColor } from "./verse-text"

const HIGHLIGHT_PALETTE: { color: HighlightColor; className: string; title: string }[] = [
  { color: "yellow", className: "bg-yellow-400 border-yellow-500/20", title: "Destacar Amarillo" },
  { color: "green", className: "bg-emerald-400 border-emerald-500/20", title: "Destacar Verde" },
  { color: "blue", className: "bg-sky-400 border-sky-500/20", title: "Destacar Azul" },
  { color: "orange", className: "bg-orange-400 border-orange-500/20", title: "Destacar Naranja" },
  { color: "pink", className: "bg-pink-400 border-pink-500/20", title: "Destacar Rosa" },
]

export interface ReaderToolbarProps {
  /** Referencia legible para desktop, p. ej. "Génesis 1:1-3,5" */
  selectionLabel: string
  /** Referencia corta para móvil, p. ej. "Gn 1:1-3" */
  mobileLabel: string
  isGuest: boolean
  canShare: boolean
  canCreateImage: boolean
  onHighlight: (color: HighlightColor | null) => void
  onCopy: () => void
  onShare: () => void
  onFavorite: () => void
  onOpenImageCreator: () => void
  onClearSelection: () => void
  onLoginRequest: () => void
}

/**
 * Barra flotante que aparece al seleccionar versículos: paleta de subrayado,
 * copiar, compartir, favorito, crear imagen y cancelar selección.
 */
export const ReaderToolbar = memo(function ReaderToolbar({
  selectionLabel,
  mobileLabel,
  isGuest,
  canShare,
  canCreateImage,
  onHighlight,
  onCopy,
  onShare,
  onFavorite,
  onOpenImageCreator,
  onClearSelection,
  onLoginRequest,
}: ReaderToolbarProps) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-background/85 backdrop-blur-md border border-border shadow-2xl rounded-full px-3 py-2 sm:px-5 sm:py-2.5 flex items-center gap-2 sm:gap-3.5 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="hidden sm:flex flex-col min-w-0">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground leading-none mb-0.5">Selección</span>
        <span className="text-xs font-bold text-foreground truncate max-w-[150px] md:max-w-[200px]">
          {selectionLabel}
        </span>
      </div>
      <div className="flex sm:hidden flex-col min-w-0 max-w-[70px]">
        <span className="text-[10px] font-bold text-foreground truncate">{mobileLabel}</span>
      </div>

      <div className="w-[1px] h-5 sm:h-6 bg-border" />

      {isGuest ? (
        <>
          <Button
            variant="default"
            size="sm"
            onClick={onCopy}
            className="h-8 rounded-full text-xs font-semibold px-2 sm:px-3 gap-1 shadow-sm cursor-pointer"
          >
            <Copy className="size-3.5" />
            <span className="hidden sm:inline">Copiar</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onLoginRequest}
            className="h-8 rounded-full text-xs font-semibold px-3 gap-1 shadow-sm cursor-pointer"
          >
            <FileText className="size-3.5" />
            <span>Iniciar sesión</span>
          </Button>
        </>
      ) : (
        <>
          {/* Paleta de subrayado */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {HIGHLIGHT_PALETTE.map(({ color, className, title }) => (
              <button
                key={color}
                onClick={() => onHighlight(color)}
                className={`size-4 sm:size-5 rounded-full border hover:scale-115 active:scale-90 transition-transform cursor-pointer ${className}`}
                title={title}
              />
            ))}
            <button
              onClick={() => onHighlight(null)}
              className="size-4 sm:size-5 rounded-full border border-border bg-background hover:bg-muted flex items-center justify-center hover:scale-115 active:scale-90 transition-transform cursor-pointer"
              title="Quitar Destacado"
            >
              <X className="size-3 text-muted-foreground" />
            </button>
          </div>

          <div className="w-[1px] h-5 sm:h-6 bg-border" />

          {/* Acciones */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            {canShare && (
              <Button
                variant="outline"
                size="sm"
                onClick={onShare}
                className="h-8 rounded-full text-xs font-semibold px-2 sm:px-3 gap-1 shadow-sm border-primary/20 hover:bg-primary/5 hover:text-primary cursor-pointer"
              >
                <Share2 className="size-3.5" />
                <span className="hidden sm:inline">Compartir</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenImageCreator}
              disabled={!canCreateImage}
              className="h-8 rounded-full text-xs font-semibold px-2 sm:px-3 gap-1 shadow-sm border-primary/20 hover:bg-primary/5 hover:text-primary cursor-pointer"
            >
              <ImageIcon className="size-3.5" />
              <span className="hidden sm:inline">Imagen</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={onCopy}
              className="h-8 rounded-full text-xs font-semibold px-2 sm:px-3 gap-1 shadow-sm cursor-pointer"
            >
              <Copy className="size-3.5" />
              <span className="hidden sm:inline">Copiar</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onFavorite}
              className="h-8 rounded-full text-amber-500 hover:text-amber-600 hover:bg-amber-50 border-amber-200 text-xs font-semibold px-2 sm:px-3 gap-1 shadow-sm cursor-pointer"
            >
              <Star className="size-3.5 fill-amber-500/20" />
              <span className="hidden sm:inline">Favorito</span>
            </Button>
          </div>
        </>
      )}

      <Button
        variant="ghost"
        size="icon"
        onClick={onClearSelection}
        className="h-7 w-7 sm:h-8 sm:w-8 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
        title="Cancelar selección"
      >
        <X className="size-4" />
      </Button>
    </div>
  )
})
