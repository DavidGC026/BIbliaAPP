import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const NOTE_FONT_OPTIONS = [
  { id: "Default", name: "Predeterminada", category: "Sistema", family: "system-ui, sans-serif" },
  { id: "serif", name: "Serif", category: "Sistema", family: "serif" },
  { id: "monospace", name: "Monospace", category: "Sistema", family: "monospace" },
  { id: "Lora", name: "Lora", category: "Serif", family: "Lora, Georgia, serif" },
  { id: "Playfair Display", name: "Playfair Display", category: "Serif", family: "'Playfair Display', Georgia, serif" },
  { id: "Merriweather", name: "Merriweather", category: "Serif", family: "Merriweather, Georgia, serif" },
  { id: "Inter", name: "Inter", category: "Sans-serif", family: "Inter, system-ui, sans-serif" },
  { id: "Montserrat", name: "Montserrat", category: "Sans-serif", family: "Montserrat, system-ui, sans-serif" },
  { id: "Roboto", name: "Roboto", category: "Sans-serif", family: "Roboto, system-ui, sans-serif" },
  { id: "Outfit", name: "Outfit", category: "Sans-serif", family: "Outfit, system-ui, sans-serif" },
  { id: "Poppins", name: "Poppins", category: "Sans-serif", family: "Poppins, system-ui, sans-serif" },
  { id: "Oswald", name: "Oswald", category: "Sans-serif", family: "Oswald, system-ui, sans-serif" },
  { id: "Fira Code", name: "Fira Code", category: "Monospace", family: "'Fira Code', monospace" },
  { id: "JetBrains Mono", name: "JetBrains Mono", category: "Monospace", family: "'JetBrains Mono', monospace" },
] as const

type Props = {
  open: boolean
  activeFont: string
  onClose: () => void
  onSelect: (font: string) => void
}

export function FontPickerDialog({ open, activeFont, onClose, onSelect }: Props) {
  if (!open) return null
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Fuente de la nota">
      <div className="flex max-h-[86%] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
          <div><h3 className="text-sm font-extrabold">Fuente de la nota</h3><p className="text-xs text-muted-foreground">Se aplica a la selección o al texto nuevo.</p></div>
          <Button type="button" size="icon" variant="ghost" className="size-8" onClick={onClose}><X className="size-4" /></Button>
        </div>
        <div className="grid gap-2 overflow-y-auto p-3 sm:grid-cols-2">
          {NOTE_FONT_OPTIONS.map((font) => (
            <button
              key={font.id}
              type="button"
              onClick={() => { onSelect(font.id); onClose() }}
              className={cn("rounded-xl border p-3 text-left transition-colors hover:bg-muted/50", activeFont === font.id ? "border-primary bg-primary/10" : "border-border bg-background")}
            >
              <span className="block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{font.category}</span>
              <span className="mt-1 block text-base font-semibold" style={{ fontFamily: font.family }}>{font.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
