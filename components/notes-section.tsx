"use client"

import { useState, type Dispatch, type SetStateAction } from "react"
import { SegmentTabs } from "@/components/ui/segment-tabs"
import { NotebookSidebar } from "@/components/notebook-sidebar"
import { Devotionals } from "@/components/devotionals"
import { PersonalLibrary } from "@/components/personal-library"
import { FileText } from "lucide-react"

type NotesSectionTab = "libretas" | "diario" | "libros"

const TABS: { key: NotesSectionTab; label: string }[] = [
  { key: "libretas", label: "Notas" },
  { key: "diario", label: "Diario" },
  { key: "libros", label: "Biblioteca" },
]

interface NotesSectionProps {
  editingNote: { id: number; title: string; content: string; tags?: string } | null
  setEditingNote: Dispatch<
    SetStateAction<{ id: number; title: string; content: string; tags?: string } | null>
  >
  onSessionExpired: () => void
}

export function NotesSection({ editingNote, setEditingNote, onSessionExpired }: NotesSectionProps) {
  const [section, setSection] = useState<NotesSectionTab>("libretas")

  if (editingNote) {
    return (
      <NotebookSidebar
        editingNote={editingNote}
        setEditingNote={setEditingNote}
        onSessionExpired={onSessionExpired}
      />
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <div className="shrink-0 px-4 pt-3">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-sm">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
            <FileText className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-[22px] font-extrabold tracking-tight text-foreground">Notas</h1>
            <p className="text-sm leading-5 text-muted-foreground">
              Apuntes, investigación, diario y biblioteca personal.
            </p>
          </div>
        </div>
      </div>

      <SegmentTabs tabs={TABS} active={section} onChange={setSection} />

      <div className="flex-1 min-h-0 overflow-hidden">
        {section === "libretas" ? (
          <NotebookSidebar
            editingNote={null}
            setEditingNote={setEditingNote}
            onSessionExpired={onSessionExpired}
            embedded
          />
        ) : null}
        {section === "diario" ? (
          <div className="h-full overflow-y-auto">
            <Devotionals />
          </div>
        ) : null}
        {section === "libros" ? (
          <div className="h-full overflow-y-auto">
            <PersonalLibrary />
          </div>
        ) : null}
      </div>
    </div>
  )
}
