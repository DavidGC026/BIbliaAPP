"use client"

import * as React from "react"
import { CheckSquare, Square } from "lucide-react"
import {
  APP_SECTION_GROUPS,
  DEFAULT_READER_SECTIONS,
  READER_ASSIGNABLE_SECTION_IDS,
} from "@/lib/app-sections"
import { cn } from "@/lib/utils"

interface SectionPermissionsEditorProps {
  selected: string[]
  onChange: (sections: string[]) => void
  disabled?: boolean
  compact?: boolean
  excludeAdminOnly?: boolean
}

export function SectionPermissionsEditor({
  selected,
  onChange,
  disabled = false,
  compact = false,
  excludeAdminOnly = true,
}: SectionPermissionsEditorProps) {
  const groups = APP_SECTION_GROUPS.map((group) => ({
    ...group,
    sections: excludeAdminOnly
      ? group.sections.filter((s) => !s.adminOnly)
      : group.sections,
  })).filter((g) => g.sections.length > 0)

  function toggle(sectionId: string) {
    if (disabled) return
    onChange(
      selected.includes(sectionId)
        ? selected.filter((id) => id !== sectionId)
        : [...selected, sectionId],
    )
  }

  function selectAll() {
    if (disabled) return
    onChange([...READER_ASSIGNABLE_SECTION_IDS])
  }

  function selectNone() {
    if (disabled) return
    onChange([])
  }

  function selectDefault() {
    if (disabled) return
    onChange([...DEFAULT_READER_SECTIONS])
  }

  return (
    <div className="space-y-3">
      {!disabled && (
        <div className="flex flex-wrap gap-2">
          <QuickAction label="Todas" onClick={selectAll} />
          <QuickAction label="Ninguna" onClick={selectNone} />
          <QuickAction label="Predeterminado" onClick={selectDefault} />
        </div>
      )}

      {groups.map((group) => (
        <div key={group.id} className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {group.label}
          </p>
          <div className={cn("grid gap-2", compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2")}>
            {group.sections.map((sec) => {
              const allowed = selected.includes(sec.id)
              return (
                <button
                  key={sec.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggle(sec.id)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl border text-left transition-colors",
                    compact ? "p-2.5 text-xs" : "p-3 text-sm",
                    disabled && "opacity-60 cursor-not-allowed",
                    !disabled && "cursor-pointer",
                    allowed
                      ? "border-primary bg-primary/5 text-foreground font-medium"
                      : "border-border bg-transparent text-muted-foreground hover:bg-accent/30",
                  )}
                >
                  {allowed ? (
                    <CheckSquare className={cn("text-primary shrink-0", compact ? "size-3.5" : "size-4")} />
                  ) : (
                    <Square className={cn("text-muted-foreground shrink-0", compact ? "size-3.5" : "size-4")} />
                  )}
                  <span className="flex-1">{sec.label}</span>
                  {sec.adminOnly && (
                    <span className="text-[9px] font-bold uppercase text-amber-600 dark:text-amber-400">
                      Admin
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function QuickAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-2.5 py-1 rounded-lg border border-border bg-muted/30 text-[10px] font-semibold text-muted-foreground hover:bg-accent/40 hover:text-foreground transition-colors"
    >
      {label}
    </button>
  )
}
