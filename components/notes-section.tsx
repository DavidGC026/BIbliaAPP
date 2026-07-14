"use client"

import { useState, type Dispatch, type SetStateAction } from "react"
import { SegmentTabs } from "@/components/ui/segment-tabs"
import { NotebookSidebar } from "@/components/notebook-sidebar"
import { Devotionals } from "@/components/devotionals"
import { PersonalLibrary } from "@/components/personal-library"
import { PrayerRequests } from "@/components/prayer-requests"
import { ReadingPlans } from "@/components/reading-plans"
import { FileText } from "lucide-react"

type NotesSectionTab = "libretas" | "diario" | "libros" | "planes" | "oracion"

const TABS: { key: NotesSectionTab; label: string }[] = [
  { key: "libretas", label: "Notas" },
  { key: "diario", label: "Diario" },
  { key: "libros", label: "Biblioteca" },
  { key: "planes", label: "Planes" },
  { key: "oracion", label: "Oración" },
]

interface NotesSectionProps {
  editingNote: { id: number; title: string; content: string; tags?: string } | null
  setEditingNote: Dispatch<
    SetStateAction<{ id: number; title: string; content: string; tags?: string } | null>
  >
  onSessionExpired: () => void
  allowedSections?: string[]
  onSelectReading?: (bookId: number, chapter: number) => void
  streakCount?: number
}

export function NotesSection({
  editingNote,
  setEditingNote,
  onSessionExpired,
  allowedSections,
  onSelectReading = () => {},
  streakCount = 0,
}: NotesSectionProps) {
  const [section, setSection] = useState<NotesSectionTab>("libretas")
  const tabs = TABS.filter((tab) => (
    tab.key === "libretas" ||
    (tab.key === "diario" && (!allowedSections || allowedSections.includes("devotionals"))) ||
    (tab.key === "libros" && (!allowedSections || allowedSections.includes("library"))) ||
    (tab.key === "planes" && (!allowedSections || allowedSections.includes("plans"))) ||
    (tab.key === "oracion" && (!allowedSections || allowedSections.includes("prayers")))
  ))
  const activeSection = tabs.some((tab) => tab.key === section) ? section : tabs[0]?.key ?? "libretas"

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
              Apuntes, diario, biblioteca y planes de lectura.
            </p>
          </div>
        </div>
      </div>

      <SegmentTabs tabs={tabs} active={activeSection} onChange={setSection} />

      <div className="flex-1 min-h-0 overflow-hidden">
        {activeSection === "libretas" ? (
          <NotebookSidebar
            editingNote={null}
            setEditingNote={setEditingNote}
            onSessionExpired={onSessionExpired}
            embedded
          />
        ) : null}
        {activeSection === "diario" ? (
          <div className="h-full overflow-y-auto">
            <Devotionals />
          </div>
        ) : null}
        {activeSection === "libros" ? (
          <div className="h-full overflow-y-auto p-4">
            <PersonalLibrary />
          </div>
        ) : null}
        {activeSection === "planes" ? (
          <div className="h-full overflow-y-auto p-3 md:p-0">
            <ReadingPlans onSelectReading={onSelectReading} streakCount={streakCount} />
          </div>
        ) : null}
        {activeSection === "oracion" ? (
          <div className="h-full overflow-y-auto">
            <PrayerRequests />
          </div>
        ) : null}
      </div>
    </div>
  )
}
