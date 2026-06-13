import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import type { AppSectionDefinition } from "@/lib/app-sections"

export interface SectionUser {
  id: number
  name: string
  username: string | null
  role: string
  streakCount: number
}

export interface SectionRenderContext {
  isGuest: boolean
  user: SectionUser | null
  allowedSections: string[]
  openLogin: () => void
  setActiveTab: (tab: string) => void
  navBookId: number | null
  navChapter: number | null
  navVerse: number | null
  navBibleId: number | null
  handleClearNavValues: () => void
  handleSelectVerse: (bookId: number, chapter: number, verse?: number, bibleId?: number) => void
  notebookEditingNote: { id: number; title: string; content: string } | null
  setNotebookEditingNote: (note: { id: number; title: string; content: string } | null) => void
  navGroupId: number | null
  handleClearNavGroupId: () => void
}

export type SectionLayout = "plain" | "fullscreen" | "card" | "notebook"

export interface SectionUIConfig {
  icon: LucideIcon
  render: (ctx: SectionRenderContext) => ReactNode
  requiresUser?: boolean
  layout?: SectionLayout
  suspenseFallback?: string
}

export type CompleteAppSectionConfig = AppSectionDefinition & SectionUIConfig
