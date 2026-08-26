"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  READER_THEME_OPTIONS,
  READER_THEME_PALETTES,
  type ReaderPreferences,
  type ReaderTheme,
} from "@/lib/reader-preferences"

type ReaderSettingsProps = {
  preferences: ReaderPreferences
  onChange: (patch: Partial<ReaderPreferences>) => void
  className?: string
}

const toggleClass = (active: boolean) =>
  cn(
    "h-10 min-w-[5.5rem] rounded-lg border px-3 text-xs font-semibold whitespace-nowrap",
    active
      ? "border-primary bg-primary text-primary-foreground shadow-sm"
      : "border-border bg-background text-muted-foreground hover:text-foreground",
  )

export function ReaderSettings({ preferences, onChange, className }: ReaderSettingsProps) {
  return (
    <div className={cn("flex w-full flex-wrap items-end gap-x-5 gap-y-4 rounded-xl border border-border/70 bg-muted/10 p-4", className)}>
      <fieldset className="min-w-[148px]">
        <legend className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Tamaño</legend>
        <div className="flex h-10 items-center rounded-lg border border-border bg-background p-1">
          <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => onChange({ fontSize: preferences.fontSize - 1 })} disabled={preferences.fontSize <= 14}>A−</Button>
          <span className="min-w-14 text-center text-xs font-bold text-muted-foreground">{preferences.fontSize}px</span>
          <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => onChange({ fontSize: preferences.fontSize + 1 })} disabled={preferences.fontSize >= 28}>A+</Button>
        </div>
      </fieldset>

      <fieldset className="min-w-[200px]">
        <legend className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Texto</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["verses", "paragraphs"] as const).map((layout) => (
            <button key={layout} type="button" aria-pressed={preferences.layout === layout} onClick={() => onChange({ layout })} className={toggleClass(preferences.layout === layout)}>
              {layout === "verses" ? "Versículos" : "Párrafos"}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="min-w-[220px]">
        <legend className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Lectura</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["relaxed", "compact"] as const).map((density) => (
            <button key={density} type="button" aria-pressed={preferences.density === density} onClick={() => onChange({ density })} className={toggleClass(preferences.density === density)}>
              {density === "relaxed" ? "Amplia" : "Compacta"}
            </button>
          ))}
          {(["left", "justify"] as const).map((align) => (
            <button key={align} type="button" aria-pressed={preferences.align === align} onClick={() => onChange({ align })} className={toggleClass(preferences.align === align)}>
              {align === "left" ? "Izquierda" : "Justificada"}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="min-w-[280px] flex-1">
        <legend className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Tema del lector</legend>
        <div className="flex flex-wrap gap-2">
          {READER_THEME_OPTIONS.map((option) => (
            <ThemeOption key={option.key} theme={option.key} label={option.label} selected={preferences.theme === option.key} onSelect={() => onChange({ theme: option.key })} />
          ))}
        </div>
      </fieldset>

      <fieldset className="min-w-[148px]">
        <legend className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Estudio</legend>
        <button
          type="button"
          role="switch"
          aria-checked={preferences.showCommentaries}
          onClick={() => onChange({ showCommentaries: !preferences.showCommentaries })}
          title="Muestra los comentarios de Matthew Henry, Spurgeon y otros autores clásicos bajo los versículos que los tengan"
          className={cn(toggleClass(preferences.showCommentaries), "w-full")}
        >
          Comentarios
        </button>
      </fieldset>
    </div>
  )
}

function ThemeOption({ theme, label, selected, onSelect }: { theme: ReaderTheme; label: string; selected: boolean; onSelect: () => void }) {
  const palette = theme === "auto" ? null : READER_THEME_PALETTES[theme]
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      title={label}
      className={cn(
        "flex h-10 min-w-[4.75rem] items-center justify-center rounded-lg border px-3 text-[11px] font-bold",
        selected ? "border-primary ring-1 ring-primary" : "border-border",
      )}
      style={palette ? { backgroundColor: palette.background, color: palette.text } : undefined}
    >
      <span>{label}</span>
    </button>
  )
}
