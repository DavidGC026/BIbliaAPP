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

export function ReaderSettings({ preferences, onChange, className }: ReaderSettingsProps) {
  return (
    <div className={cn("grid w-full gap-3 rounded-xl border border-border/70 bg-muted/10 p-3 md:grid-cols-[auto_1fr_1fr]", className)}>
      <fieldset>
        <legend className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Tamaño</legend>
        <div className="flex h-9 items-center rounded-lg border border-border bg-background p-0.5">
          <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => onChange({ fontSize: preferences.fontSize - 1 })} disabled={preferences.fontSize <= 14}>A−</Button>
          <span className="min-w-12 text-center text-xs font-bold text-muted-foreground">{preferences.fontSize}px</span>
          <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => onChange({ fontSize: preferences.fontSize + 1 })} disabled={preferences.fontSize >= 28}>A+</Button>
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Lectura</legend>
        <div className="grid grid-cols-2 gap-1">
          {(["relaxed", "compact"] as const).map((density) => (
            <button key={density} type="button" onClick={() => onChange({ density })} className={cn("h-9 rounded-lg border px-2 text-xs font-semibold", preferences.density === density ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground")}>
              {density === "relaxed" ? "Amplia" : "Compacta"}
            </button>
          ))}
          {(["left", "justify"] as const).map((align) => (
            <button key={align} type="button" onClick={() => onChange({ align })} className={cn("h-9 rounded-lg border px-2 text-xs font-semibold", preferences.align === align ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground")}>
              {align === "left" ? "Izquierda" : "Justificada"}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Tema del lector</legend>
        <div className="grid grid-cols-5 gap-1">
          {READER_THEME_OPTIONS.map((option) => (
            <ThemeOption key={option.key} theme={option.key} label={option.label} selected={preferences.theme === option.key} onSelect={() => onChange({ theme: option.key })} />
          ))}
        </div>
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
      className={cn("flex h-9 min-w-0 items-center justify-center rounded-lg border px-1 text-[10px] font-bold", selected ? "border-primary ring-1 ring-primary" : "border-border")}
      style={palette ? { backgroundColor: palette.background, color: palette.text } : undefined}
    >
      <span className="truncate">{label}</span>
    </button>
  )
}
