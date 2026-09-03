import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { HIGHLIGHT_COLOR_ITEMS } from "@/lib/highlightColors";

export interface ReaderToolbarProps {
  selectionLabel: string;
  canShare?: boolean;
  canCreateImage?: boolean;
  onHighlight: (color: string | null) => void;
  onCopy: () => void;
  onShare?: () => void;
  onFavorite?: () => void;
  onAddNote?: () => void;
  onOpenImageCreator?: () => void;
  onCrossReferences?: () => void;
  onListen?: () => void;
  onClearSelection: () => void;
}

export function ReaderToolbar({
  selectionLabel,
  canShare = true,
  canCreateImage = true,
  onHighlight,
  onCopy,
  onShare,
  onFavorite,
  onAddNote,
  onOpenImageCreator,
  onCrossReferences,
  onListen,
  onClearSelection,
}: ReaderToolbarProps) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-xl animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-2xl border border-border/80 bg-card/95 p-3 shadow-2xl backdrop-blur-md">
        {/* Label and highlight color picker */}
        <div className="flex items-center gap-3">
          <span className="font-serif text-xs font-semibold text-foreground truncate max-w-[140px] sm:max-w-[180px]">
            {selectionLabel}
          </span>

          <div className="flex items-center gap-1.5 border-l border-border/60 pl-3">
            {HIGHLIGHT_COLOR_ITEMS.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => onHighlight(c.key)}
                className="size-5 rounded-full border border-black/10 transition-transform hover:scale-125 focus:outline-none focus:ring-1 focus:ring-ring"
                style={{ backgroundColor: c.hex }}
                title={`Subrayar ${c.label}`}
              />
            ))}

            <button
              type="button"
              onClick={() => onHighlight(null)}
              className="flex size-5 items-center justify-center rounded-full border border-border bg-background text-[10px] text-muted-foreground transition-transform hover:scale-125"
              title="Quitar subrayado"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-1 border-t sm:border-t-0 border-border/40 pt-2 sm:pt-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onCopy}
            className="size-8 p-0"
            title="Copiar versículo(s)"
          >
            <Icon name="copy" size={14} />
          </Button>

          {onFavorite && (
            <Button
              variant="outline"
              size="sm"
              onClick={onFavorite}
              className="size-8 p-0 text-rose-500 hover:text-rose-600"
              title="Guardar en favoritos"
            >
              <Icon name="heart" size={14} />
            </Button>
          )}

          {onAddNote && (
            <Button
              variant="outline"
              size="sm"
              onClick={onAddNote}
              className="size-8 p-0 text-primary hover:text-primary"
              title="Añadir nota al versículo"
            >
              <Icon name="notes" size={14} />
            </Button>
          )}

          {canCreateImage && onOpenImageCreator && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenImageCreator}
              className="size-8 p-0 text-amber-500 hover:text-amber-600"
              title="Crear imagen para compartir"
            >
              <Icon name="image" size={14} />
            </Button>
          )}

          {onCrossReferences && (
            <Button
              variant="outline"
              size="sm"
              onClick={onCrossReferences}
              className="size-8 p-0 text-sky-500 hover:text-sky-600"
              title="Referencias cruzadas"
            >
              <Icon name="sparkles" size={14} />
            </Button>
          )}

          {onListen && (
            <Button
              variant="outline"
              size="sm"
              onClick={onListen}
              className="size-8 p-0 text-emerald-500 hover:text-emerald-600"
              title="Escuchar selección (TTS)"
            >
              <Icon name="volume" size={14} />
            </Button>
          )}

          {canShare && onShare && (
            <Button
              variant="outline"
              size="sm"
              onClick={onShare}
              className="size-8 p-0"
              title="Compartir"
            >
              <Icon name="share" size={14} />
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={onClearSelection}
            className="size-8 p-0 text-muted-foreground hover:bg-muted"
            title="Deseleccionar"
          >
            <Icon name="close" size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}
