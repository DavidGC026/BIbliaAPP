"use client"

import { useState, type Dispatch, type SetStateAction } from "react"
import { SegmentTabs } from "@/components/ui/segment-tabs"
import { NotebookSidebar } from "@/components/notebook-sidebar"
import { Devotionals } from "@/components/devotionals"
import { PersonalLibrary } from "@/components/personal-library"

type NotesSectionTab = "libretas" | "diario" | "libros"

const TABS: { key: NotesSectionTab; label: string }[] = [
  { key: "libretas", label: "Libretas" },
  { key: "diario", label: "Diario" },
  { key: "libros", label: "Libros" },
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
      <div className="px-4 pt-2 pb-1 shrink-0">
        <h1 className="text-[22px] font-bold tracking-tight text-foreground">Notas</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Libretas, vida espiritual y biblioteca personal.
        </p>
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
